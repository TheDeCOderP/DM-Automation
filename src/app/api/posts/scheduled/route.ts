import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/**
 * GET endpoint to fetch all scheduled posts for the current user
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Get all brands the user has access to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: token.id },
      select: { brandId: true },
    });

    const brandIds = userBrands.map((ub) => ub.brandId);

    // Find all scheduled posts for user's brands
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        brandId: {
          in: brandIds,
        },
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        socialAccountPage: {
          select: {
            name: true,
            pageName: true,
            platform: true,
          },
        },
        media: {
          select: {
            id: true,
            url: true,
            type: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    // Add additional info about each post
    const postsWithStatus = scheduledPosts.map((post) => {
      const scheduledTime = post.scheduledAt ? new Date(post.scheduledAt) : null;
      const isPastDue = scheduledTime ? scheduledTime <= now : false;
      const timeUntil = scheduledTime
        ? Math.floor((scheduledTime.getTime() - now.getTime()) / 1000 / 60)
        : null;

      return {
        ...post,
        isPastDue,
        timeUntilMinutes: timeUntil,
        timeUntilFormatted: timeUntil
          ? timeUntil < 0
            ? `${Math.abs(timeUntil)} minutes overdue`
            : timeUntil < 60
            ? `${timeUntil} minutes`
            : timeUntil < 1440
            ? `${Math.floor(timeUntil / 60)} hours`
            : `${Math.floor(timeUntil / 1440)} days`
          : "Unknown",
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: scheduledPosts.length,
        posts: postsWithStatus,
        currentTime: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch scheduled posts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
