// app/api/accounts/google/drive/files/[id]/route.ts
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import type { SocialAccount } from "@prisma/client";
import { decryptToken } from "@/lib/encryption";

/**
 * Helper that checks whether a Date is expired (with a 60s buffer).
 */
function isTokenExpired(expiresAt: Date | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now() + 60_000; // 60s buffer
}

/**
 * Refresh Google access token using the stored refresh token.
 * Updates the SocialAccount row in the DB with the new access token and expiry.
 */
async function refreshGoogleToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    // Since isConnected field doesn't exist, we can't update it
    throw new Error("Google refresh token is missing. User needs to re-authenticate.");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google client credentials are not configured.");
  }

  const tokenUrl = "https://oauth2.googleapis.com/token";
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: socialAccount.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Failed to refresh Google token:", data);
    // Since isConnected field doesn't exist, we can't update it
    throw new Error(
      `Could not refresh Google token. Reason: ${data.error_description || data.error || "Unknown error"}`
    );
  }

  const newAccessToken = data.access_token as string | undefined;
  const expiresIn = typeof data.expires_in === "number" ? data.expires_in : parseInt(data.expires_in || "0", 10);

  if (!newAccessToken) {
    throw new Error("Refresh response did not contain access_token.");
  }

  const newExpiresAt = expiresIn && !Number.isNaN(expiresIn)
    ? new Date(Date.now() + expiresIn * 1000)
    : null;

  await prisma.socialAccount.update({
    where: { id: socialAccount.id },
    data: {
      accessToken: newAccessToken,
      tokenExpiresAt: newExpiresAt,
    },
  });

  return newAccessToken;
}

/**
 * GET handler - downloads a Google Drive file by ID for the authenticated user
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // getToken: include secret to be safe if NEXTAUTH_SECRET is set
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Fix TypeScript errors by using proper type checking
    if (!token || typeof token !== "object" || !("id" in token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const userId = token.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: "Missing file id" }, { status: 400 });
    }

    // Find the Google social account through user junction table
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
      return NextResponse.json({ error: "No connected Google account found" }, { status: 404 });
    }

    const socialAccount = userSocialAccount.socialAccount;

    // If token expired (or missing), refresh
    let accessToken = await decryptToken(socialAccount.accessToken);
    if (!accessToken || isTokenExpired(socialAccount.tokenExpiresAt)) {
      accessToken = await refreshGoogleToken(socialAccount);
    }

    // Construct OAuth2 client with credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: accessToken,
      // include refresh token if present (not strictly required here)
      refresh_token: socialAccount.refreshToken ?? undefined,
    });

    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // Get file metadata (name, mimeType, size)
    const meta = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,size",
    });

    const mimeType = meta.data.mimeType ?? "application/octet-stream";
    const filename = meta.data.name ?? fileId;

    // Download file as stream
    const resp = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    );

    // Convert stream to buffer (safe for reasonably-sized files).
    // If you expect very large files, you'd want to stream to the client directly.
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      resp.data.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      resp.data.on("end", () => resolve());
      resp.data.on("error", (err: Error) => reject(err));
    });
    const buffer = Buffer.concat(chunks);

    // Return file
    const headers = new Headers();
    headers.set("Content-Type", mimeType);
    // make filename safer
    const safeName = encodeURIComponent(filename).replace(/['()]/g, "");
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${safeName}`);
    headers.set("Content-Length", String(buffer.length));

    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("Error in Google Drive file download route:", err);
    const message = err instanceof Error ? err.message : "Failed to download file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}