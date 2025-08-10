import { prisma } from "@/lib/prisma";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToLinkedin } from "@/services/linkedin.service";
import { publishToTwitter } from "@/services/twitter.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Add 5 minute buffer to catch edge cases
    const bufferMs = 5 * 60 * 1000;
    const windowStart = new Date(oneHourAgo.getTime() - bufferMs);
    const windowEnd = new Date(now.getTime() + bufferMs);

    console.log("Time window:", windowStart.toISOString(), "to", windowEnd.toISOString());

    // Find posts that should be published now
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          {
            scheduledAt: {
              gte: windowStart,
              lte: windowEnd
            }
          },
          {
            OR: [
              {
                // One-time scheduled posts
                status: "SCHEDULED",
                frequency: "ONCE"
              },
              {
                // Recurring posts that need to be reposted
                status: "SCHEDULED",
                frequency: { not: "ONCE" }
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

    console.log(`Found ${posts.length} posts to process`);

    // Process the posts
    for (const post of posts) {
      try {
        console.log(`Processing post ${post.id} scheduled for ${post.scheduledAt}`);
        
        if (post.platform === "LINKEDIN") {
          await publishToLinkedin(post);
        } else if (post.platform === "TWITTER") {
          await publishToTwitter(post);
        } else if (post.platform === "FACEBOOK") {
          await publishToFacebook(post);
        }

        // Update post status
        await prisma.post.update({
          where: { id: post.id },
          data: { 
            status: "PUBLISHED",
            publishedAt: now,
            updatedAt: now
          }
        });

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to process post ${post.id}:`, errorMessage);
        
        await prisma.post.update({
          where: { id: post.id },
          data: { 
            status: "FAILED",
            updatedAt: now
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
      processedPosts: posts.length,
      timeWindow: {
        start: windowStart.toISOString(),
        end: windowEnd.toISOString()
      }
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