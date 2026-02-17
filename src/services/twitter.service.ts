import { prisma } from "@/lib/prisma";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";
import { decryptToken } from "@/lib/encryption";
import { Post, Media, SocialAccount } from "@prisma/client";
import type { TwitterTweetResponse, TweetBody } from "@/types/twitter";
import { updateCalendarItemStatus } from "@/utils/calendar-status-updater";

export async function publishToTwitter(
    post: Post & { media?: Media[] }
): Promise<TwitterTweetResponse["data"]> {
    if (!post) {
        throw new Error("Invalid input for publishToTwitter");
    }

    // Find Twitter account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: {
            OR: [
            // Case 1: User personally connected the brand’s LinkedIn account
            {
                userId: post.userId,
                socialAccount: {
                platform: 'TWITTER',
                brands: {
                    some: {
                    brandId: post.brandId
                    }
                }
                }
            },
            // Case 2: Another user connected the LinkedIn account, but it's linked to the same brand
            {
                socialAccount: {
                platform: 'TWITTER',
                brands: {
                    some: {
                    brandId: post.brandId
                    }
                }
                },
                user: {
                brands: {
                    some: {
                    brandId: post.brandId
                    }
                }
                }
            }
            ]
        },
        include: {
            socialAccount: true,
            user: true
        }
    });


    if (!userSocialAccount) {
        await prisma.post.update({
            where: { id: post.id },
            data: { status: "FAILED", updatedAt: new Date() },
        });

        await prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_FAILED",
                title: "Post Failed",
                message: `Failed to publish your post on Twitter - no connected account`,
                metadata: {
                    postId: post.id,
                    platform: "TWITTER",
                },
            },
        });

        throw new Error("User has no connected Twitter account for this brand");
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    // Token refresh
    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }

    // Get media if not provided
    const media = post.media || (await prisma.media.findMany({ where: { postId: post.id } }));

    const tweetBody: TweetBody = { text: post.content };

    if (media.length > 0) {
        try {
            const mediaIds = await Promise.all(
                media.map((m) => uploadMediaToTwitter(m, accessToken))
            );
            tweetBody.media = { media_ids: mediaIds };
        } catch (error) {
            console.error("Media upload failed:", error);
            // Continue without media if upload fails
        }
    }

    const tweetResponse = await fetch("https://api.twitter.com/2/tweets", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tweetBody),
    });

    const data: TwitterTweetResponse = await tweetResponse.json();

    if (!tweetResponse.ok) {
        await handleTwitterPostFailure(post, socialAccount, data);
        throw new Error(`Twitter API error: ${data.errors?.[0]?.detail || "Unknown error"}`);
    }

    await recordSuccessfulPost(post, socialAccount, data.data.id);
    return data.data;
}

async function uploadMediaToTwitter(media: Media, accessToken: string): Promise<string> {
  // 1. Fetch the media file from Cloudinary (or any external URL).
  const response = await fetch(media.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch media from URL: ${media.url}`);
  }

  // 2. Convert the media to a base64 string.
  const buffer = await response.arrayBuffer();
  const base64Media = Buffer.from(buffer).toString("base64");

  // 3. Build the request payload for X v2 media upload API.
  const payload = {
    shared: false, // optional: whether media is shared
    media: base64Media, // base64-encoded media
    media_category: media.type.startsWith("video") ? "tweet_video" : "tweet_image"
  };

  // 4. Call the X v2 media upload API.
  const uploadResponse = await fetch("https://api.x.com/2/media/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`, // use your OAuth2.0 Bearer token
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const uploadData = await uploadResponse.json();
  console.log("uploadData", uploadData);

  if (!uploadResponse.ok || !uploadData.data?.id) {
    throw new Error(`Failed to upload media to Twitter: ${JSON.stringify(uploadData)}`);
  }

  // 5. Return the uploaded media ID (used to attach media in a tweet).
  return uploadData.data.id;
}

async function recordSuccessfulPost(
    post: Post,
    socialAccount: SocialAccount,
    tweetId: string
) {
    await prisma.$transaction([
        prisma.post.update({
            where: { id: post.id },
            data: { 
                status: 'PUBLISHED',
                url: `https://twitter.com/i/status/${tweetId}`,
                publishedAt: new Date(),
                updatedAt: new Date()
            }
        }),
        prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_PUBLISHED",
                title: "Post Published",
                message: `Your post has been successfully published on Twitter`,
                metadata: {
                    postId: post.id,
                    platform: "TWITTER",
                    tweetUrl: `https://twitter.com/i/status/${tweetId}`
                }
            }
        })
    ]);

    // Update calendar item status if applicable
    await updateCalendarItemStatus(post.id);
}

async function handleTwitterPostFailure(
    post: Post,
    socialAccount: SocialAccount,
    errorData: TwitterTweetResponse
) {
    await prisma.$transaction([
        prisma.post.update({
            where: { id: post.id },
            data: { 
                status: 'FAILED',
                updatedAt: new Date()
            }
        }),
        prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_FAILED",
                title: "Post Failed",
                message: `Failed to publish your post on Twitter`,
                metadata: {
                    postId: post.id,
                    platform: "TWITTER",
                    error: errorData.errors?.[0]?.detail || 'Unknown error'
                }
            }
        })
    ]);

    console.error('Twitter post failed:', errorData);
}

export async function fetchTwitterPostAnalytics(post: Post) {
    if (!post?.userId) throw new Error("Missing userId");

    let tweetId: string | null = null;

    if (post.url) {
        // Extract URN from LinkedIn URL
        tweetId =  post.url.split("/").pop() || null;
    }

    if (!tweetId) throw new Error("Missing Twitter post ID");

    // Find Twitter account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: { 
            userId: post.userId, 
            socialAccount: {
                platform: "TWITTER"
            }
        },
        include: {
            socialAccount: true
        }
    });

    if (!userSocialAccount) {
        throw new Error("No connected Twitter account found");
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }

    const res = await fetch(
        `https://api.x.com/2/tweets?ids=${tweetId}&tweet.fields=public_metrics&expansions=attachments.media_keys&media.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    console.log(res);

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Twitter API failed: ${err}`);
    }

    const data = await res.json();
    console.log(data);
    return data?.data?.[0]?.public_metrics || null;
}