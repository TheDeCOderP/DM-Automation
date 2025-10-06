import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/encryption";

import type { SocialAccount } from "@prisma/client";
import type { ZohoTokenResponse } from "@/types/zoho";
import type { TwitterErrorResponse, TwitterTokenResponse } from "@/types/twitter";


export const getTokenValidDays = (expiryDate: Date | null | undefined): number => {
  if (!expiryDate) return 0;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export function isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}

export async function refreshAccessToken(socialAccount: SocialAccount): Promise<string> {
  switch (socialAccount.platform) {
    case "ZOHO_WORKDRIVE":
      return refreshZohoAccessToken(socialAccount);
    case "GOOGLE":
    case "YOUTUBE":
      return refreshGoogleAccessToken(socialAccount);
    case "TWITTER":
      return refreshTwitterAccessToken(socialAccount);
    default:
      throw new Error(`Unsupported platform: ${socialAccount.platform}`);
  }
}

async function refreshZohoAccessToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new Error('Zoho refresh token is missing. User needs to re-authenticate.');
  }

  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho client credentials are not configured.");
  }

  try {
    const refreshRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        refresh_token: socialAccount.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await refreshRes.json();
    
    if (!refreshRes.ok) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    const { access_token, refresh_token, expires_in } = data;

    const encryptedAccessToken = await encryptToken(access_token);
    let encryptedRefreshToken = socialAccount.refreshToken; // fallback
    if (data.refresh_token) {
      encryptedRefreshToken = await encryptToken(data.refresh_token);
    }
    const tokenExpiresAt = new Date(Date.now() + parseInt(expires_in) * 1000);

    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
      },
    });

    return access_token;
  } catch (error) {
    console.error("Error refreshing Zoho token:", error);
    throw new Error('Failed to refresh Zoho token');
  }
}

async function refreshGoogleAccessToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new Error("Google refresh token is missing. User needs to re-authenticate.");
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error("Google client credentials are not configured.");
  }

  try {
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

    const { access_token, refresh_token, expires_in } = data;

    const encryptedAccessToken = await encryptToken(access_token);
    let encryptedRefreshToken = socialAccount.refreshToken;
    if (data.refresh_token) {
      encryptedRefreshToken = await encryptToken(data.refresh_token);
    }
    const tokenExpiresAt = new Date(Date.now() + parseInt(expires_in) * 1000);

    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
      },
    });

    return access_token;
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    throw new Error("Failed to refresh Google token");
  }
}


async function refreshTwitterAccessToken(socialAccount: SocialAccount): Promise<string> {
    if (!socialAccount.refreshToken) {
        throw new Error("Twitter refresh token is missing. User needs to re-authenticate.");
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        throw new Error("Twitter client credentials are not configured.");
    }

    try {
      const basicAuth = Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
      ).toString("base64");

      const response = await fetch("https://api.twitter.com/2/oauth2/token", {
          method: "POST",
          headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: `Basic ${basicAuth}`,
          },
          body: new URLSearchParams({
              refresh_token: socialAccount.refreshToken,
              grant_type: "refresh_token",
              client_id: process.env.TWITTER_CLIENT_ID!,
          }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`Could not refresh Twitter token. Reason: ${data.error_description || data.error || "Unknown error"}`);
      }

      const { access_token, refresh_token, expires_in } = data;
      const encryptedAccessToken = await encryptToken(access_token);
      const encryptedRefreshToken = await encryptToken(refresh_token);
      const tokenExpiresAt = new Date(Date.now() + parseInt(expires_in) * 1000);

      await prisma.socialAccount.update({
          where: { id: socialAccount.id },
          data: {
              accessToken: encryptedAccessToken,
              refreshToken: encryptedRefreshToken,
              tokenExpiresAt
          },
      });

      return access_token;
    } catch (error) {
      console.error("Error refreshing Twitter token:", error);
      throw new Error("Failed to refresh Twitter token");
    }
}
