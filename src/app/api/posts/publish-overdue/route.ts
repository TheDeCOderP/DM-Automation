import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { publishToTwitter } from "@/services/twitter.service";
import { publishToYouTube } from "@/services/youtube.service";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToPinterest } from "@/services/pinterest.service";
import { publishToLinkedin, publishToLinkedInPage } from "@/services/linkedin.service";
import { publishToReddit } from "@/services/reddit.service";
import { publishToInstagram } from "@/services/instagram.service";
import { publishToTikTok } from "@/services/tiktok.service";
import { updateCalendarItemStatus } from "@/utils/calendar-status-updater";
import { getToken } from "next-auth/jwt";

/**
 * Manual endpoint to publish overdue scheduled posts
 * This can be called manually or set up as a backup cron job
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication - either cron token or user session
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    const token = await getToken({ req });

    const isAuthorizedCron = expectedToken && authHeader === `Bearer ${expectedToken}`;
    const isAuthorizedUser = token?.id;

    if (!isAuthorizedCron && !isAuthorizedUser) {
      console.warn("Unauthorized publish-overdue attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const now = new Date();
    
    console.log(`[PUBLISH-OVERDUE] Starting at ${now.toISOString()}`);
    
    // Find all scheduled posts that are overdue
    const overduePosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now,
        },
      },
      include: {
        media: true,
        brand: true,
        socialAccountPage: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 50,
    });

    console.log(`[PUBLISH-OVERDUE] Found ${overduePosts.length} overdue posts`);

    if (overduePosts.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No overdue posts found",
          published: 0,
        },
        { status: 200 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as { postId: string; error: string }[],
    };

    // Process each overdue post
    for (const post of overduePosts) {
      try {
        const minutesOverdue = Math.floor((now.getTime() - (post.scheduledAt?.getTime() || 0)) / 1000 / 60);
        console.log(`[PUBLISH-OVERDUE] Publishing post ${post.id} (${minutesOverdue} min overdue) on ${post.platform}`);

        // Publish based on platform
        if (post.platform === "LINKEDIN") {
          if (post.socialAccountPageId) {
            await publishToLinkedInPage(post);
          } else {
            await publishToLinkedin(post);
          }
        } else if (post.platform === "FACEBOOK") {
          await publishToFacebook(post);
        } else if (post.platform === "TWITTER") {
          await publishToTwitter(post);
        } else if (post.platform === "YOUTUBE") {
          await publishToYouTube(post);
        } else if (post.platform === "PINTEREST") {
          await publishToPinterest(post);
        } else if (post.platform === "REDDIT") {
          await publishToReddit(post);
        } else if (post.platform === "INSTAGRAM") {
          await publishToInstagram(post);
        } else if (post.platform === "TIKTOK") {
          await publishToTikTok(post);
        }

        // Update post status to PUBLISHED
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            updatedAt: now,
          },
        });

        // Update calendar item status if applicable
        await updateCalendarItemStatus(post.id);

        // Create success notification
        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "POST_PUBLISHED",
            title: "Overdue Post Published",
            message: `Your overdue post has been published on ${post.platform}`,
            metadata: {
              postId: post.id,
              platform: post.platform,
              publishedAt: now.toISOString(),
              wasOverdue: true,
            },
          },
        });

        results.success.push(post.id);
        console.log(`[PUBLISH-OVERDUE] ✓ Successfully published post ${post.id}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[PUBLISH-OVERDUE] ✗ Failed to publish post ${post.id}:`, errorMessage);

        // Update post status to FAILED
        await prisma.post.update({
          where: { id: post.id },
          data: {
            status: "FAILED",
            updatedAt: now,
          },
        });

        // Create failure notification
        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "POST_FAILED",
            title: "Post Publishing Failed",
            message: `Failed to publish your overdue post on ${post.platform}`,
            metadata: {
              postId: post.id,
              platform: post.platform,
              error: errorMessage,
            },
          },
        });

        results.failed.push({ postId: post.id, error: errorMessage });
      }
    }

    console.log(`[PUBLISH-OVERDUE] Completed: ${results.success.length} success, ${results.failed.length} failed`);

    return NextResponse.json(
      {
        success: true,
        message: "Overdue posts processed",
        timestamp: now.toISOString(),
        processed: overduePosts.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUBLISH-OVERDUE] Fatal error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(req: NextRequest) {
  console.log("[PUBLISH-OVERDUE] Manual GET request received");
  return POST(req);
}
