// app/api/accounts/google/drive/files/[id]/route.ts
import { google } from "googleapis"
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { SocialAccount } from "@prisma/client";

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 60000);
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

  return newAccessToken;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const params = await context.params;
    const fileId = params.id;

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

    // Get file metadata
    const fileMetadata = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size'
    });

    // Download file
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return file as blob
    return new Response(buffer, {
      headers: {
        'Content-Type': fileMetadata.data.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileMetadata.data.name}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
  }
}