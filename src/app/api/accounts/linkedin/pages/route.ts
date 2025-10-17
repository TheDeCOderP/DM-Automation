// app/api/accounts/linkedin/pages/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");

    if (!platformUserId || typeof platformUserId !== 'string') {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Find the social account and its pages directly from database
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

    // Simply return the pages we already have in the database
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