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

/**
 * Cron Job Endpoint - Called by external cron service to publish scheduled posts
 * This endpoint processes all posts that are scheduled to be published
 */
export async function POST(req: NextRequest) {
  try {
    // Verify the request is from authorized source
    const authHeader = req.headers.get("authorization");
    const expectedToken = process.env.CRON_SECRET_TOKEN;

    // If CRON_SECRET_TOKEN is not set, allow for backward compatibility
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.warn("Unauthorized cron job attempt");
      return NextResponse.json(
        { error: "Unauthorized - Invalid cron token" },
        { status: 401 }
      );
    }

    const now = new Date();
    
    console.log(`[CRON] Starting scheduled post publishing at ${now.toISOString()}`);
    
    // Find all scheduled posts that should be published now
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: {
          lte: now, // Posts scheduled for now or earlier
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
      take: 50, // Process max 50 posts per run to avoid timeout
    });

    console.log(`[CRON] Found ${scheduledPosts.length} posts to publish`);

    const results = {
      success: [] as string[],
      failed: [] as { postId: string; error: string }[],
    };

    // Process each post
    for (const post of scheduledPosts) {
      try {
        console.log(`[CRON] Publishing post ${post.id} on ${post.platform}`);

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

        // Create success notification
        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "POST_PUBLISHED",
            title: "Post Published Successfully",
            message: `Your post has been published on ${post.platform}`,
            metadata: {
              postId: post.id,
              platform: post.platform,
              publishedAt: now.toISOString(),
            },
          },
        });

        results.success.push(post.id);
        console.log(`[CRON] ✓ Successfully published post ${post.id}`);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[CRON] ✗ Failed to publish post ${post.id}:`, errorMessage);

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
            message: `Failed to publish your post on ${post.platform}`,
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

    console.log(`[CRON] Completed: ${results.success.length} success, ${results.failed.length} failed`);

    return NextResponse.json(
      {
        success: true,
        message: "Cron job completed",
        timestamp: now.toISOString(),
        processed: scheduledPosts.length,
        successCount: results.success.length,
        failedCount: results.failed.length,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CRON] Fatal error:", error);
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
  console.log("[CRON] Manual GET request received");
  return POST(req);
}