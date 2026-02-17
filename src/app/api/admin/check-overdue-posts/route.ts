import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/**
 * Admin endpoint to check for overdue posts
 * Returns a summary of posts that should have been published but weren't
 */
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (you can add role check here)
    // For now, any authenticated user can check

    const now = new Date();
    
    // Find overdue posts
    const overduePosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        brand: {
          select: { name: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Find broken calendar items (scheduled but no posts)
    const scheduledCalendarItems = await prisma.contentCalendarItem.findMany({
      where: {
        status: 'SCHEDULED',
      },
      include: {
        postGroup: {
          include: {
            posts: true,
          },
        },
        calendar: {
          select: {
            topic: true,
            brand: {
              select: { name: true },
            },
          },
        },
      },
    });

    const brokenCalendarItems = scheduledCalendarItems.filter(
      item => !item.postGroup || item.postGroup.posts.length === 0
    );

    // Calculate statistics
    const overdueStats = overduePosts.map(post => {
      const minutesOverdue = post.scheduledAt 
        ? Math.floor((now.getTime() - post.scheduledAt.getTime()) / 1000 / 60)
        : 0;
      
      return {
        id: post.id,
        title: post.title || 'Untitled',
        platform: post.platform,
        scheduledAt: post.scheduledAt?.toISOString(),
        minutesOverdue,
        brand: post.brand?.name,
        user: post.user?.name,
      };
    });

    const brokenItemsStats = brokenCalendarItems.map(item => ({
      id: item.id,
      day: item.day,
      topic: item.topic,
      suggestedTime: item.suggestedTime?.toISOString(),
      calendar: item.calendar.topic,
      brand: item.calendar.brand.name,
    }));

    const hasIssues = overduePosts.length > 0 || brokenCalendarItems.length > 0;

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      hasIssues,
      summary: {
        overduePosts: overduePosts.length,
        brokenCalendarItems: brokenCalendarItems.length,
      },
      overduePosts: overdueStats,
      brokenCalendarItems: brokenItemsStats,
      actions: hasIssues ? {
        publishOverdue: overduePosts.length > 0 ? '/api/posts/publish-overdue' : null,
        fixBrokenItems: brokenCalendarItems.length > 0 ? 'Run: node scripts/reset-empty-scheduled-items.js' : null,
      } : null,
    });

  } catch (error) {
    console.error("[CHECK-OVERDUE] Error:", error);
    return NextResponse.json(
      { 
        error: "Failed to check overdue posts",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
