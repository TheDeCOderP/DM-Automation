import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

// Security Helper
async function verifyUserBrandAccess(userId: string, locationId: string) {
  const location = await prisma.gbpLocation.findUnique({
    where: { id: locationId },
    select: { brandId: true },
  });
  if (!location) return null;
  const membership = await prisma.userBrand.findUnique({
    where: { userId_brandId: { userId, brandId: location.brandId } },
  });
  return membership ? location.brandId : null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { locationId } = await context.params;

    if (!(await verifyUserBrandAccess(session.user.id, locationId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const business = await prisma.gbpLocation.findUnique({
      where: { id: locationId },
      include: { socialAccount: true },
    });

    if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // 🛑 NEW: Prevent 403 errors by blocking unverified locations
    // if (!business.isVerified) {
    //   return NextResponse.json(
    //     { error: "Performance insights are only available for verified locations. Please verify this business on Google." }, 
    //     { status: 403 }
    //   );
    // }

    let accessToken = await decryptToken(business.socialAccount.accessToken);

    if (isTokenExpired(business.socialAccount.tokenExpiresAt)) {
      console.log(`[GBP] Token expired for account ${business.socialAccount.id}. Refreshing...`);
      accessToken = await refreshAccessToken(business.socialAccount);
    }

    // Calculate dynamic 30-day time range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // 1. GUARANTEE the correct format: 'locations/{locationId}'
    const nameParts = business.locationName.split('/');
    const cleanLocationId = nameParts[nameParts.length - 1]; 
    const performanceResourceName = `locations/${cleanLocationId}`;

    // 2. Build the complex Query String required for the GET request
    const queryParams = new URLSearchParams();
    
    // Append each metric individually 
    const metrics = [
      "WEBSITE_CLICKS",
      "CALL_CLICKS",
      "BUSINESS_DIRECTION_REQUESTS",
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"
    ];
    metrics.forEach(metric => queryParams.append('dailyMetrics', metric));

    // Append Start Date
    queryParams.append('dailyRange.startDate.year', startDate.getFullYear().toString());
    queryParams.append('dailyRange.startDate.month', (startDate.getMonth() + 1).toString());
    queryParams.append('dailyRange.startDate.day', startDate.getDate().toString());

    // Append End Date
    queryParams.append('dailyRange.endDate.year', endDate.getFullYear().toString());
    queryParams.append('dailyRange.endDate.month', (endDate.getMonth() + 1).toString());
    queryParams.append('dailyRange.endDate.day', endDate.getDate().toString());

    // 3. Construct URL and execute GET request
    const requestUrl = `https://businessprofileperformance.googleapis.com/v1/${performanceResourceName}:fetchMultiDailyMetricsTimeSeries?${queryParams.toString()}`;

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // 4. Error Handling
    if (!response.ok) {
      const errorText = await response.text(); 
      console.error(`Google Performance API Error (${response.status}):`, errorText);
      return NextResponse.json(
        { error: "Failed to fetch insights from Google API" }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform Google's nested response into a flat array for Recharts
    const chartDataMap = new Map();

    for (let i = 0; i <= 30; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      chartDataMap.set(dateStr, { 
        date: dateStr, 
        impressions: 0, 
        interactions: 0,
        websiteClicks: 0,
        calls: 0
      });
    }

    if (data.multiDailyMetricTimeSeries) {
      data.multiDailyMetricTimeSeries.forEach((series: any) => {
        const metricName = series.dailyMetric;
        const datedValues = series.timeSeries?.datedValues || [];

        datedValues.forEach((dataPoint: any) => {
          const d = dataPoint.date;
          if (!d || !d.year || !d.month || !d.day) return;

          const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
          
          if (chartDataMap.has(dateStr)) {
            const entry = chartDataMap.get(dateStr);
            const value = parseInt(dataPoint.value || "0", 10);

            if (metricName.includes('IMPRESSIONS')) {
              entry.impressions += value;
            } else if (metricName.includes('CLICKS') || metricName === 'BUSINESS_DIRECTION_REQUESTS') {
              entry.interactions += value;
              if (metricName === 'WEBSITE_CLICKS') entry.websiteClicks += value;
              if (metricName === 'CALL_CLICKS') entry.calls += value;
            }
          }
        });
      });
    }

    return NextResponse.json({
      timeSeries: Array.from(chartDataMap.values()),
    });

  } catch (error) {
    console.error("Insights Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}