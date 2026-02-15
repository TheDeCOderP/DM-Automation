// app/api/accounts/linkedin/pages/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { decryptToken, encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");
    const refresh = searchParams.get("refresh") === "true";

    if (!platformUserId || typeof platformUserId !== 'string') {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Find the social account
    const account = await prisma.socialAccount.findFirst({
      where: {
        platformUserId: platformUserId,
        platform: "LINKEDIN",
      },
      include: {
        pages: {
          where: {
            platform: "LINKEDIN",
            isActive: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: "No LinkedIn account found" }, { status: 404 });
    }

    // If refresh is requested, fetch new pages from LinkedIn API
    if (refresh && account.accessToken) {
      try {
        const accessToken = await decryptToken(account.accessToken);
        
        // Fetch LinkedIn Pages (Organizations) where user is ADMIN
        const aclsRes = await fetch(
          "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&state=APPROVED",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
              "LinkedIn-Version": "202410",
            },
          }
        );

        if (!aclsRes.ok) {
          const errText = await aclsRes.text();
          console.error("ACLs fetch failed:", errText);
          throw new Error(`Failed to fetch LinkedIn pages: ${aclsRes.status}`);
        }

        const aclsData = await aclsRes.json();
        const orgIds =
          aclsData.elements
            ?.map((el: { organization: string; role: string; state: string }) => 
              el.organization?.split(":").pop()
            )
            ?.filter(Boolean) || [];

        let newPagesCount = 0;

        // Fetch org details & save/update them
        if (orgIds.length > 0) {
          for (const orgId of orgIds) {
            try {
              const orgRes = await fetch(
                `https://api.linkedin.com/v2/organizations/${orgId}?projection=(id,localizedName,vanityName,logoV2(original~:playableStreams,cropped~:playableStreams))`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "X-Restli-Protocol-Version": "2.0.0",
                    "LinkedIn-Version": "202410",
                  },
                }
              );
              
              if (!orgRes.ok) {
                console.warn(`Failed to fetch org ${orgId}:`, orgRes.status);
                continue;
              }

              const orgData = await orgRes.json();
              const pageName = orgData.localizedName || "Unknown Page";

              let pageImage: string | null = null;
              if (orgData?.logoV2) {
                const imgs =
                  orgData.logoV2["original~"]?.elements ||
                  orgData.logoV2["cropped~"]?.elements;
                if (imgs && imgs.length > 0) {
                  pageImage =
                    imgs[0]?.identifiers?.[0]?.identifier ||
                    imgs[0]?.data?.["com.linkedin.digitalmedia.mediaartifact.StillImage"]?.displayImageUrl ||
                    null;
                }
              }

              // Encrypt page access token
              const encryptedPageAccessToken = await encryptToken(accessToken);

              // Check if this is a new page
              const existingPage = await prisma.socialAccountPage.findUnique({
                where: {
                  pageId_socialAccountId: {
                    pageId: orgId,
                    socialAccountId: account.id,
                  },
                },
              });

              if (!existingPage) {
                newPagesCount++;
              }

              // Store/update page token
              await prisma.socialAccountPage.upsert({
                where: {
                  pageId_socialAccountId: {
                    pageId: orgId,
                    socialAccountId: account.id,
                  },
                },
                update: {
                  accessToken: encryptedPageAccessToken,
                  pageName,
                  pageImage,
                  tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
                  isActive: true,
                  name: pageName,
                },
                create: {
                  name: pageName,
                  pageId: orgId,
                  pageName,
                  pageImage,
                  platform: "LINKEDIN",
                  accessToken: encryptedPageAccessToken,
                  tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
                  isActive: true,
                  socialAccountId: account.id,
                },
              });
            } catch (err) {
              console.error(`Failed to save org ${orgId}:`, err);
            }
          }
        }

        // Fetch updated pages from database
        const updatedAccount = await prisma.socialAccount.findFirst({
          where: {
            id: account.id,
          },
          include: {
            pages: {
              where: {
                platform: "LINKEDIN",
                isActive: true
              }
            }
          }
        });

        const pages = updatedAccount?.pages.map(page => ({
          id: page.id,
          name: page.name,
          pageId: page.pageId,
          pageName: page.pageName,
          pageImage: page.pageImage,
          platform: page.platform,
          isActive: page.isActive
        })) || [];

        return NextResponse.json({ 
          message: newPagesCount > 0 
            ? `Successfully refreshed! Found ${newPagesCount} new page(s)` 
            : "Pages refreshed successfully",
          pages: pages,
          refreshedAt: new Date().toISOString(),
          newPagesCount
        });

      } catch (refreshError) {
        console.error("Error refreshing pages from LinkedIn:", refreshError);
        // Fall back to returning cached pages
      }
    }

    // Return cached pages from database
    const pages = account.pages.map(page => ({
      id: page.id,
      name: page.name,
      pageId: page.pageId,
      pageName: page.pageName,
      pageImage: page.pageImage,
      platform: page.platform,
      isActive: page.isActive
    }));

    return NextResponse.json({ 
      message: "LinkedIn pages fetched successfully", 
      pages: pages,
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching LinkedIn pages:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch pages",
        message: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}