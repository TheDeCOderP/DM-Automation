// app/api/accounts/google/drive/files/route.ts
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import type { SocialAccount } from "@prisma/client";

function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now() + 60_000; // 1 min buffer
}

async function refreshGoogleToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    // Since isConnected field doesn't exist, we can't update it
    throw new Error("Google refresh token missing. Re-auth required.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google client credentials not configured.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: socialAccount.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Failed to refresh Google token:", data);
    throw new Error(
      `Could not refresh Google token. Reason: ${data.error_description || data.error || "Unknown error"}`
    );
  }

  const newAccessToken = data.access_token as string;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : parseInt(data.expires_in || "0", 10);
  const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

  await prisma.socialAccount.update({
    where: { id: socialAccount.id },
    data: {
      accessToken: newAccessToken,
      tokenExpiresAt: newExpiresAt,
    },
  });

  console.log("✅ Refreshed Google token");
  return newAccessToken;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Fix TypeScript errors by using proper type checking
    if (!token || typeof token !== "object" || !("id" in token)) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    
    const userId = token.id;

    if (!userId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Find Google account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId: userId,
        socialAccount: {
          platform: "GOOGLE",
        },
      },
      include: {
        socialAccount: true,
      },
    });

    if (!userSocialAccount) {
      return NextResponse.json({ error: "No Google Account found" }, { status: 404 });
    }

    const account = userSocialAccount.socialAccount;

    let accessToken = account.accessToken;
    if (!accessToken || isTokenExpired(account.tokenExpiresAt)) {
      accessToken = await refreshGoogleToken(account);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: account.refreshToken ?? undefined,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    const res = await drive.files.list({
      pageSize: 10,
      fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
    });

    const files = res.data.files ?? [];

    return new Response(JSON.stringify(files), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json({ error: "Failed to fetch files" }, { status: 500 });
  }
}