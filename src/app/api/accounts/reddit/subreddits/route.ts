// app/api/social-accounts/reddit/subreddits/route.ts
import { decryptToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new Response("Unauthorized", { status: 401 });

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
        platform: "REDDIT",
      },
      include: {
        pages: {
          where: {
            platform: "REDDIT",
            isActive: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: "No Reddit account found" }, { status: 404 });
    }

    const accessToken = await decryptToken(account.accessToken);

    const redditResponse = await fetch(
      'https://oauth.reddit.com/subreddits/mine/subscriber?limit=100',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
        }
      }
    );

    if (!redditResponse.ok) {
      console.error('Failed to fetch Reddit subreddits:', redditResponse);
      return NextResponse.json({ error: "Failed to fetch Reddit subreddits" }, { status: 500 });
    }

    const redditData = await redditResponse.json();

    // Process Reddit subreddits and store them as pages
    const pages = await Promise.all(
      redditData.data.children.map(async (sub: any) => {
        const subreddit = sub.data;
        const pageId = `t5_${subreddit.id}`; // Reddit uses t5_ prefix for subreddit IDs
        
        // Upsert the subreddit as a page in the database
        const socialAccountPage = await prisma.socialAccountPage.upsert({
          where: {
            pageId_socialAccountId: {
              pageId: pageId,
              socialAccountId: account.id
            }
          },
          update: {
            name: subreddit.display_name,
            pageName: subreddit.title,
            pageImage: subreddit.community_icon || subreddit.icon_img || null,
            accessToken: account.accessToken,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            name: subreddit.display_name,
            pageId: pageId,
            pageName: subreddit.title,
            pageImage: subreddit.community_icon || subreddit.icon_img || null,
            platform: 'REDDIT',
            accessToken: account.accessToken,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true,
            socialAccountId: account.id
          }
        });

        return {
          id: socialAccountPage.id,
          name: socialAccountPage.name,
          pageId: socialAccountPage.pageId,
          pageName: socialAccountPage.pageName,
          pageImage: socialAccountPage.pageImage,
          platform: 'REDDIT',
          description: subreddit.public_description,
          subscribers: subreddit.subscribers,
          url: `https://reddit.com${subreddit.url}`,
          createdUtc: subreddit.created_utc,
          over18: subreddit.over18,
          isStored: true
        };
      })
    );

    return NextResponse.json({ 
      message: 'Reddit subreddits fetched successfully', 
      pages: pages 
    });
  } catch (error) {
    console.log("Error while fetching subreddits:", error);
    return NextResponse.json({ error: `Something went wrong` }, { status: 500 });
  }
}