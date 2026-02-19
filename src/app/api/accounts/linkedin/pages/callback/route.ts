// app/api/accounts/linkedin/page/callback/route.ts
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  // Build redirect URI dynamically from request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/accounts/linkedin/pages/callback`;
 
  if (!code || !state) {
    const errorUrl = new URL("/auth/error", request.nextUrl.origin);
    errorUrl.searchParams.set("message", "missing_code_or_state");
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // Parse state to get userId and brandId
    const { brandId, returnUrl } = JSON.parse(state);

    if (!brandId) {
      throw new Error("Invalid state: missing userId or brandId");
    }

    // 1️⃣ Exchange code for token (Page App credentials)
    const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_PAGES_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_PAGES_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;

    // 2️⃣ Fetch LinkedIn profile using the correct endpoint
    const profileRes = await fetch("https://api.linkedin.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202410",
      },
    });
    
    if (!profileRes.ok) {
      const errorText = await profileRes.text();
      console.error("Profile fetch failed:", errorText);
      throw new Error(`Failed to fetch LinkedIn profile: ${profileRes.status} ${profileRes.statusText}`);
    }
    
    const profile = await profileRes.json();

    // Extract user ID and name from the response
    const platformUserId = profile.id;
    const platformUsername = `${profile.localizedFirstName} ${profile.localizedLastName}`.trim();

    // 3️⃣ Find existing LinkedIn social account for this brand
    const linkedinAccount = await prisma.socialAccount.findFirst({
      where: {
        platform: "LINKEDIN",
        brands: {
          some: {
            brandId: brandId
          }
        }
      },
      include: {
        brands: {
          where: {
            brandId: brandId
          }
        }
      }
    });

    if (!linkedinAccount) {
      throw new Error("No LinkedIn account found for this brand. Please connect a LinkedIn account first.");
    }

    // 4️⃣ Encrypt tokens for storage
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || "");

    // 5️⃣ Update the existing social account with page access tokens
    // Only update tokens, not platformUserId/platformUsername to avoid unique constraint violation
    await prisma.socialAccount.update({
      where: {
        id: linkedinAccount.id
      },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || null,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        lastSyncedAt: new Date(),
      }
    });

    // 6️⃣ Fetch LinkedIn Pages (Organizations) where user has posting permissions
    // Fetch all approved roles, then filter for posting-capable roles
    const aclsRes = await fetch(
      "https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&state=APPROVED",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202410",
        },
      }
    );

    let connectedPages = 0;

    if (!aclsRes.ok) {
      const errText = await aclsRes.text();
      console.error("ACLs fetch failed:", errText);
      // Continue even if ACLs fail
    } else {
      const aclsData = await aclsRes.json();
      
      // Filter for roles that allow posting content
      const postingRoles = ['ADMINISTRATOR', 'CONTENT_ADMINISTRATOR', 'DIRECT_SPONSORED_CONTENT_POSTER'];
      const orgIds =
        aclsData.elements
          ?.filter((el: { organization: string; role: string; state: string }) => 
            postingRoles.includes(el.role)
          )
          ?.map((el: { organization: string; role: string; state: string }) => el.organization?.split(":").pop())
          ?.filter(Boolean) || [];

      // 7️⃣ Fetch org details & save them as Page Tokens using the existing socialAccountId
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

            // Store page token linked to the existing social account
            await prisma.socialAccountPage.upsert({
              where: {
                pageId_socialAccountId: {
                  pageId: orgId,
                  socialAccountId: linkedinAccount.id,
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
                socialAccountId: linkedinAccount.id,
              },
            });

            connectedPages++;
          } catch (err) {
            console.error(`Failed to save org ${orgId}:`, err);
          }
        }
      }
    }

    // 8️⃣ Redirect back to the return URL or dashboard
    const redirectUrl = new URL(returnUrl || "/accounts", origin);
    redirectUrl.searchParams.set("linkedinPage", "connected");
    if (connectedPages > 0) {
      redirectUrl.searchParams.set("pages", connectedPages.toString());
    }
    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    console.error("LinkedIn Page callback error:", error);
    const errorUrl = new URL("/auth/error", request.nextUrl.origin);
    errorUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}