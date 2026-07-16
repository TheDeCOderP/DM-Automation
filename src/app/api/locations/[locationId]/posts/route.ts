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

    let accessToken = await decryptToken(business.socialAccount.accessToken);

    if (isTokenExpired(business.socialAccount.tokenExpiresAt)) {
      console.log(`[GBP] Token expired for account ${business.socialAccount.id}. Refreshing...`);
      accessToken = await refreshAccessToken(business.socialAccount);
    }

    // 1. Fetch the user's GBP accounts to get the required `accountId` prefix
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!accountsRes.ok) {
      return NextResponse.json({ error: "Failed to resolve Google Account ID" }, { status: 502 });
    }
    
    const accountsData = await accountsRes.json();
    const gbpAccounts = accountsData.accounts || [];

    let localPosts = [];
    let fetchSuccess = false;

    // 2. Fetch Local Posts from v4 API
    for (const account of gbpAccounts) {
      const postsRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${account.name}/${business.locationName}/localPosts`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        localPosts = postsData.localPosts || [];
        fetchSuccess = true;
        break; 
      }
    }

    if (!fetchSuccess) {
      return NextResponse.json({ error: "Failed to fetch posts from Google Business Profile API." }, { status: 502 });
    }

    return NextResponse.json({ posts: localPosts });

  } catch (error) {
    console.error("Local Posts Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}