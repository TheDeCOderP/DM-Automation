import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { SocialAccount, Platform } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}

async function refreshGoogleToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new Error("Google refresh token is missing. User needs to re-authenticate.");
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google client credentials are not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: socialAccount.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Could not refresh Google token. Reason: ${data.error_description || data.error || "Unknown error"}`);
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

  console.log("✅ Successfully refreshed and updated Google token");
  return newAccessToken;
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Get user's Google accounts through the junction table
    const userSocialAccounts = await prisma.userSocialAccount.findMany({
      where: {
        userId: token.id,
        socialAccount: {
          platform: Platform.GOOGLE
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccounts.length) {
      throw new Error("No Google Account found");
    }

    const accounts = await Promise.all(
      userSocialAccounts.map(async (userSocialAccount) => {
        let socialAccount = userSocialAccount.socialAccount;
        
        // Check expiry and refresh if needed
        if (isTokenExpired(socialAccount.tokenExpiresAt)) {
          const newAccessToken = await refreshGoogleToken(socialAccount);
          socialAccount = {
            ...socialAccount,
            accessToken: newAccessToken
          };
        }

        return socialAccount;
      })
    );

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    console.error("GET /api/google-account error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}