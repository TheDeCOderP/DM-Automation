// app/api/accounts/google/drive/files/route.ts
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/encryption";

import { isTokenExpired, refreshAccessToken } from "@/utils/token";

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

    let accessToken = await decryptToken(account.accessToken);
    if (!accessToken || isTokenExpired(account.tokenExpiresAt)) {
      accessToken = await refreshAccessToken(account);
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