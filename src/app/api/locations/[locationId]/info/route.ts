import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

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

    // Handle Token
    let accessToken = await decryptToken(business.socialAccount.accessToken);
    if (isTokenExpired(business.socialAccount.tokenExpiresAt)) {
      accessToken = await refreshAccessToken(business.socialAccount);
    }

    // Fetch Full Business Info from v1 API
    // We use a readMask to get all fields: name, profile, hours, etc.
    const readMask = "name,title,websiteUri,phoneNumbers,regularHours,address";
    const response = await fetch(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${business.locationName}?readMask=${readMask}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Business Info API Error:", errorText);
      return NextResponse.json({ error: "Failed to fetch business info from Google" }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching business info:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}