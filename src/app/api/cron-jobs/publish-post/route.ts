import { prisma } from "@/lib/prisma";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToLinkedin, publishToLinkedInPage } from "@/services/linkedin.service";
import { publishToTwitter } from "@/services/twitter.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const now = new Date();
    
    // Get start and end of today in UTC
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    console.log("Current UTC time:", now.toISOString());
    console.log("Today's UTC range:", todayStart.toISOString(), "to", todayEnd.toISOString());

    // Find posts that are scheduled for today (any time)
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          {
            status: "SCHEDULED"
          },
          {
            scheduledAt: {
              gte: todayStart,
              lte: todayEnd
            }
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

    console.log(`Found ${posts.length} posts scheduled for today to process`);

    // Process the posts
    for (const post of posts) {
      try {
        console.log(`Processing post ${post.id} scheduled for ${post.scheduledAt}`);
        
        if (post.platform === "LINKEDIN") {
          if(post.socialAccountPageId) {
            await publishToLinkedInPage(post);
          } else {
            await publishToLinkedin(post);
          }
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
      message: "Daily cron job executed successfully",
      processedPosts: posts.length,
      timeWindow: {
        start: todayStart.toISOString(),
        end: todayEnd.toISOString()
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