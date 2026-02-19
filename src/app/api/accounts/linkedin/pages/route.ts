// app/api/accounts/linkedin/pages/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { decryptToken, encryptToken } from "@/lib/encryption";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");
    const refresh = searchParams.get("refresh") === "true";

    if (!platformUserId || typeof platformUserId !== 'string') {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Find the social account
    const account = await prisma.socialAccount.findFirst({
      where: {
        platformUserId: platformUserId,
        platform: "LINKEDIN",
      },
      include: {
        pages: {
          where: {
            platform: "LINKEDIN",
            isActive: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: "No LinkedIn account found" }, { status: 404 });
    }

    // Note: Refresh from LinkedIn API is not supported here because the personal account token
    // doesn't have organization permissions. Pages must be fetched through the OAuth callback
    // flow using the LinkedIn Pages app credentials (LINKEDIN_PAGES_CLIENT_ID).
    // This endpoint only returns cached pages from the database.

    // Return cached pages from database
    const pages = account.pages.map(page => ({
      id: page.id,
      name: page.name,
      pageId: page.pageId,
      pageName: page.pageName,
      pageImage: page.pageImage,
      platform: page.platform,
      isActive: page.isActive
    }));

    return NextResponse.json({ 
      message: "LinkedIn pages fetched successfully", 
      pages: pages,
      refreshedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Error fetching LinkedIn pages:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch pages",
        message: error instanceof Error ? error.message : "Unknown error" 
      }, 
      { status: 500 }
    );
  }
}