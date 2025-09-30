// app/api/accounts/zoho/workdrive/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { SocialAccount, Platform } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}

async function refreshZohoToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new Error("Zoho refresh token is missing. User needs to re-authenticate.");
  }

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho client credentials are not configured.");
  }

  const response = await fetch("https://accounts.zoho.in/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: socialAccount.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Could not refresh Zoho token. Reason: ${data.error || data.error_description || "Unknown error"}`);
  }

  const { access_token: newAccessToken, expires_in: expiresIn } = data;

  const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
  await prisma.socialAccount.update({
    where: { id: socialAccount.id },
    data: {
      accessToken: newAccessToken,
      tokenExpiresAt: newExpiresAt,
    },
  });

  console.log("✅ Successfully refreshed and updated Zoho token");
  return newAccessToken;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Get user's Zoho WorkDrive accounts through the junction table
    const userSocialAccounts = await prisma.userSocialAccount.findMany({
      where: {
        userId: token.id,
        socialAccount: {
          platform: Platform.ZOHO_WORKDRIVE
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccounts.length) {
      return NextResponse.json({ 
        error: "No Zoho WorkDrive Account found" 
      }, { status: 404 });
    }

    const accounts = await Promise.all(
      userSocialAccounts.map(async (userSocialAccount) => {
        let socialAccount = userSocialAccount.socialAccount;
        
        // Check expiry and refresh if needed
        if (isTokenExpired(socialAccount.tokenExpiresAt)) {
          try {
            const newAccessToken = await refreshZohoToken(socialAccount);
            socialAccount = {
              ...socialAccount,
              accessToken: newAccessToken
            };
          } catch (refreshError) {
            console.error("Failed to refresh Zoho token:", refreshError);
            // Continue with existing token even if refresh fails
          }
        }

        return socialAccount;
      })
    );

    return NextResponse.json({ account: accounts[0] }, { status: 200 });

  } catch (error) {
    console.error("GET /api/accounts/zoho/workdrive error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}