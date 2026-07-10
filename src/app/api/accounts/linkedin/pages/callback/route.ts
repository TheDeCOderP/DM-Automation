// app/api/accounts/linkedin/page/callback/route.ts
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  
  // Use NEXTAUTH_URL as canonical base to handle reverse proxy (Apache, Nginx, etc.)
  // request.nextUrl.origin would return the internal host (localhost:3010) behind a proxy
  const origin = process.env.NEXTAUTH_URL || request.nextUrl.origin;
  const redirectUri = `${origin}/api/accounts/linkedin/pages/callback`;
 
  if (!code || !state) {
    const errorUrl = new URL("/auth/error", process.env.NEXTAUTH_URL || request.nextUrl.origin);
    errorUrl.searchParams.set("message", "missing_code_or_state");
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // Parse state to get userId and brandId
    const { brandId, returnUrl, userId } = JSON.parse(decodeURIComponent(state));

    if (!brandId) {
      throw new Error("Invalid state: missing brandId");
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

    // 3️⃣ Find or create a LinkedIn social account for THIS user (by platformUserId)
    //    Then make sure it's linked to the brand.
    //    This ensures any brand member can renew — not just the original connector.
    let linkedinAccount = await prisma.socialAccount.findUnique({
      where: {
        platform_platformUserId: {
          platform: "LINKEDIN",
          platformUserId: platformUserId,
        },
      },
    });

    // 4️⃣ Encrypt tokens
    const encryptedAccessToken = await encryptToken(accessToken);
    const encryptedRefreshToken = tokenData.refresh_token
      ? await encryptToken(tokenData.refresh_token)
      : null;
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    if (linkedinAccount) {
      // Update existing account with fresh tokens
      linkedinAccount = await prisma.socialAccount.update({
        where: { id: linkedinAccount.id },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          platformUsername,
          lastSyncedAt: new Date(),
        },
      });
    } else {
      // Create new social account for this user
      linkedinAccount = await prisma.socialAccount.create({
        data: {
          platform: "LINKEDIN",
          platformUserId,
          platformUsername,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
        },
      });
    }

    // 5️⃣ Ensure this social account is linked to the brand
    await prisma.socialAccountBrand.upsert({
      where: {
        brandId_socialAccountId: {
          brandId,
          socialAccountId: linkedinAccount.id,
        },
      },
      update: {},
      create: {
        brandId,
        socialAccountId: linkedinAccount.id,
      },
    });

    // Also ensure UserSocialAccount link exists so the user can see it
    if (userId) {
      await prisma.userSocialAccount.upsert({
        where: {
          userId_socialAccountId: {
            userId,
            socialAccountId: linkedinAccount.id,
          },
        },
        update: {},
        create: {
          userId,
          socialAccountId: linkedinAccount.id,
        },
      });
    }

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

      // 7️⃣ Fetch org details & save/update Page Tokens linked to THIS user's social account
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
            const pageTokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000); // 60 days

            // Upsert page linked to THIS user's social account
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
                tokenExpiresAt: pageTokenExpiresAt,
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
                tokenExpiresAt: pageTokenExpiresAt,
                isActive: true,
                socialAccountId: linkedinAccount.id,
              },
            });

            // Also update any OTHER social accounts linked to this brand that have
            // the same pageId — so posts scheduled against the old account still work.
            await prisma.socialAccountPage.updateMany({
              where: {
                pageId: orgId,
                isActive: true,
                socialAccount: {
                  brands: { some: { brandId } },
                },
                // Don't re-update the one we just upserted
                NOT: { socialAccountId: linkedinAccount.id },
              },
              data: {
                accessToken: encryptedPageAccessToken,
                tokenExpiresAt: pageTokenExpiresAt,
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
    const errorUrl = new URL("/auth/error", process.env.NEXTAUTH_URL || request.nextUrl.origin);
    errorUrl.searchParams.set(
      "message",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}