import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { refreshAccessToken, isTokenExpired } from "@/utils/token";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try parsing a target brandId from the request body to execute brand-scoped sync
    let brandId: string | null = null;
    try {
      const body = await req.json();
      brandId = body.brandId || null;
    } catch {
      // Body may be empty, fallback to query param or checking global accounts safely
    }

    // If no explicit brandId provided, look for one via URL params
    if (!brandId) {
      const { searchParams } = new URL(req.url);
      brandId = searchParams.get("brandId");
    }

    if (!brandId) {
      return NextResponse.json(
        { error: "Missing brandId context for synchronization" },
        { status: 400 }
      );
    }

    // Security Gatekeeper: Verify the active user actually belongs to this brand
    const userBrandMembership = await prisma.userBrand.findUnique({
      where: {
        userId_brandId: {
          userId: session.user.id,
          brandId: brandId,
        },
      },
    });

    if (!userBrandMembership) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this brand workspace" },
        { status: 403 }
      );
    }

    // Fetch the social accounts that are explicitly connected to this brand context
    const connectedAccounts = await prisma.socialAccountBrand.findMany({
      where: {
        brandId: brandId,
        socialAccount: {
          platform: "GOOGLE_BUSINESS_PROFILE",
        },
      },
      include: {
        socialAccount: true,
      },
    });

    if (connectedAccounts.length === 0) {
      return NextResponse.json({ 
        message: "No Google Business Profile integration connected to this brand workspace.",
        count: 0 
      });
    }

    let totalSynced = 0;

    // Loop through the authenticated social configurations scoped directly to this workspace
    for (const link of connectedAccounts) {
      const { socialAccount } = link;
      
      // Decrypt credentials
      let accessToken = await decryptToken(socialAccount.accessToken);

      if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
      }

      // Fetch GBP Accounts (Agency / Location Groups / Personal Contexts)
      const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!accountsRes.ok) {
        console.error(`Failed to fetch GBP accounts container for account: ${socialAccount.id}`);
        continue;
      }
      
      const accountsData = await accountsRes.json();
      const gbpAccounts = accountsData.accounts || [];

      // Fetch Locations for each individual GBP organizational account path
      for (const gbpAccount of gbpAccounts) {
        const readMask = 'name,title,storeCode,categories,storefrontAddress,metadata';
        const locationsRes = await fetch(
          `https://mybusinessbusinessinformation.googleapis.com/v1/${gbpAccount.name}/locations?readMask=${readMask}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        
        if (!locationsRes.ok) {
          console.error(`Failed fetching locations path for account profile container: ${gbpAccount.name}`);
          continue;
        }
        
        const locationsData = await locationsRes.json();
        const locations = locationsData.locations || [];

        // Atomically Upsert locations to ensure complete global data consistency
        for (const location of locations) {
          await prisma.gbpLocation.upsert({
            where: { 
              locationName: location.name 
            },
            update: {
              title: location.title,
              primaryCategory: location.categories?.primaryCategory || null,
              address: location.storefrontAddress || null,
              socialAccountId: socialAccount.id,
              brandId: brandId, // Explicitly anchors to verified runtime parameter target context
              isVerified: location.metadata?.hasPendingVerification === false,
            },
            create: {
              locationName: location.name,
              title: location.title,
              primaryCategory: location.categories?.primaryCategory || null,
              address: location.storefrontAddress || null,
              socialAccountId: socialAccount.id,
              brandId: brandId,
              isVerified: location.metadata?.hasPendingVerification === false,
            }
          });
          totalSynced++;
        }
      }
    }

    return NextResponse.json({ 
      message: `Successfully synced ${totalSynced} workspace locations.`,
      count: totalSynced
    });

  } catch (error) {
    console.error("Critical error during multi-tenant GBP sync:", error);
    return NextResponse.json(
      { error: "Failed to synchronize enterprise locations securely" },
      { status: 500 }
    );
  }
}