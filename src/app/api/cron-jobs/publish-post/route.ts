import { prisma } from "@/lib/prisma";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToLinkedin } from "@/services/linkedin.service";
import { publishToTwitter } from "@/services/twitter.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    
    // Find posts that are either:
    // 1. One-time scheduled posts that are due (scheduledAt <= now)
    // 2. Recurring posts that need to be reposted based on their frequency
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          {
            // One-time scheduled posts
            scheduledAt: { lte: now },
            status: "SCHEDULED",
            frequency: null // No frequency means it's a one-time post
          },
          {
            // Recurring posts that need to be reposted
            status: "PUBLISHED", // Previously published
            frequency: { not: null }, // Has a frequency
            OR: [
              {
                // Daily posts - last published more than 24 hours ago
                frequency: "DAILY",
                publishedAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) }
              },
              {
                // Weekly posts - last published more than 7 days ago
                frequency: "WEEKLY",
                publishedAt: { lte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }
              },
              {
                // Monthly posts - last published more than 30 days ago
                frequency: "MONTHLY",
                publishedAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
              }
            ]
          }
        ]
      },
      include: {
        media: true,
        user: {
          include: {
            socialAccounts: true
          }
        }
      }
    });

    // Process the posts
    for (const post of posts) {
      try {
        if (post.platform === "LINKEDIN") {
          await publishToLinkedin(post);
        } else if (post.platform === "TWITTER") {
          await publishToTwitter(post);
        } else if (post.platform === "FACEBOOK") {
          await publishToFacebook(post);
        } else if (post.platform === "INSTAGRAM") {
          // TODO
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle posting failure
        await prisma.post.update({
          where: { id: post.id },
          data: { 
            status: "FAILED",
            updatedAt: new Date()
          }
        });

        await prisma.notification.create({
          data: {
            userId: post.userId,
            type: "POST_FAILED",
            title: "Post Failed",
            message: `Failed to publish your post on ${post.platform}`,
            metadata: {
              postId: post.id,
              platform: post.platform,
              error: errorMessage
            }
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cron job executed successfully",
      processedPosts: posts.length
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Cron job error:", errorMessage);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}