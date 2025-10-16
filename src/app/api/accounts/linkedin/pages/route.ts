// app/api/accounts/linkedin/pages/refresh/route.ts
import { decryptToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");

    if (!platformUserId || typeof platformUserId !== 'string') {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Find the social account
    const account = await prisma.socialAccount.findFirst({
      where: {
        platformUserId: platformUserId,
        platform: "LINKEDIN",
      },
    });

    if (!account) {
      return NextResponse.json({ error: "No LinkedIn account found" }, { status: 404 });
    }

    const accessToken = await decryptToken(account.accessToken);

    // Fetch fresh data from LinkedIn API
    const aclsResponse = await fetch(
      `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202410",
        },
      }
    );

    if (aclsResponse.status === 429) {
      const retryAfter = aclsResponse.headers.get("Retry-After");
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: retryAfter || "unknown",
        },
        { status: 429 }
      );
    }

    if (!aclsResponse.ok) {
      const errorText = await aclsResponse.text();
      console.error("LinkedIn ACLs Error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch LinkedIn organizations" },
        { status: aclsResponse.status }
      );
    }

    const aclsData = await aclsResponse.json();

    if (!aclsData.elements || aclsData.elements.length === 0) {
      // Deactivate all existing page tokens since user has no pages
      await prisma.pageToken.updateMany({
        where: {
          socialAccountId: account.id,
          platform: "LINKEDIN"
        },
        data: {
          isActive: false
        }
      });

      return NextResponse.json({ 
        message: "No LinkedIn pages found", 
        pages: [] 
      });
    }

    // Extract organization IDs
    const orgIds = aclsData.elements
      .map((el: { organization: string; role: string; state: string }) => {
        const urn = el.organization;
        return urn.split(":").pop();
      })
      .filter(Boolean);

    if (orgIds.length === 0) {
      return NextResponse.json({ 
        message: "No LinkedIn pages found", 
        pages: [] 
      });
    }

    // Fetch organization details and update database
    const updatedPages = await Promise.all(
      orgIds.map(async (orgId: string) => {
        try {
          const orgResponse = await fetch(
            `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams,cropped~:playableStreams))`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-Restli-Protocol-Version": "2.0.0",
                "LinkedIn-Version": "202410",
              },
            }
          );

          if (!orgResponse.ok) {
            console.error(`Failed to fetch org ${orgId}:`, orgResponse.statusText);
            return null;
          }

          const orgData = await orgResponse.json();

          // Extract logo URL
          let pageImage = null;
          if (orgData?.logoV2) {
            const originalImages = orgData.logoV2["original~"]?.elements;
            const croppedImages = orgData.logoV2["cropped~"]?.elements;
            const images = originalImages || croppedImages;

            if (images && images.length > 0) {
              pageImage =
                images[0]?.identifiers?.[0]?.identifier ||
                images[0]?.data?.["com.linkedin.digitalmedia.mediaartifact.StillImage"]?.displayImageUrl ||
                null;
            }
          }

          const pageName = orgData.localizedName || orgData.name || "Unknown Organization";
          const encryptedAccessToken = await encryptToken(accessToken);

          // Upsert the page token
          const pageToken = await prisma.pageToken.upsert({
            where: {
              pageId_socialAccountId: {
                pageId: orgId,
                socialAccountId: account.id
              }
            },
            update: {
              accessToken: encryptedAccessToken,
              pageName: pageName,
              pageImage: pageImage,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
              isActive: true,
            },
            create: {
              name: pageName,
              pageId: orgId,
              pageName: pageName,
              pageImage: pageImage,
              platform: 'LINKEDIN',
              accessToken: encryptedAccessToken,
              tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
              isActive: true,
              socialAccountId: account.id,
            }
          });

          return {
            id: pageToken.id,
            name: pageToken.name,
            pageId: pageToken.pageId,
            pageName: pageToken.pageName,
            pageImage: pageToken.pageImage,
            platform: 'LINKEDIN',
            isActive: pageToken.isActive
          };
        } catch (error) {
          console.error(`Error processing org ${orgId}:`, error);
          return null;
        }
      })
    );

    // Deactivate pages that are no longer accessible
    const activeOrgIds = orgIds;
    await prisma.pageToken.updateMany({
      where: {
        socialAccountId: account.id,
        platform: "LINKEDIN",
        pageId: {
          notIn: activeOrgIds
        }
      },
      data: {
        isActive: false
      }
    });

    const validPages = updatedPages.filter(Boolean);

    return NextResponse.json({ 
      message: "LinkedIn pages refreshed successfully", 
      pages: validPages,
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error refreshing LinkedIn pages:", error);
    return NextResponse.json(
      { 
        error: "Failed to refresh pages",
        message: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}