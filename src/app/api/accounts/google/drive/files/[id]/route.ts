// app/api/accounts/google/drive/files/[id]/route.ts
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

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
      accessToken = await refreshAccessToken(socialAccount);
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