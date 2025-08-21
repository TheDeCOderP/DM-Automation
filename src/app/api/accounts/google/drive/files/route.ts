//api/accounts/google/drive/files/route.ts
import { google } from "googleapis"
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { SocialAccount } from "@prisma/client";

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
    console.error("Failed to refresh Google token:", data);
    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: { isConnected: false },
    });
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
    const account = await prisma.socialAccount.findFirst({
      where: {
        userId: token.id,
        platform: "GOOGLE",
      },
    });

    if (!account) {
      throw new Error("No Google Account found");
    }

    // Check expiry
    if (isTokenExpired(account.tokenExpiresAt)) {
      account.accessToken = await refreshGoogleToken(account);
    }

    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: account.accessToken })

    const drive = google.drive({ version: "v3", auth: oauth2Client })

    const res = await drive.files.list({
      pageSize: 10, // Fetch up to 10 files
      fields: "nextPageToken, files(id, name, mimeType, webViewLink)",
    })

    const files = res.data.files
    return new Response(JSON.stringify(files), { status: 200 })
  } catch (error) {
    console.error("Error fetching files:", error)
    return new Response(JSON.stringify({ error: "Failed to fetch files" }), { status: 500 })
  }
}