import { prisma } from "@/lib/prisma";
import { Post, Media, SocialAccount, MediaType } from "@prisma/client";

interface TwitterTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
}

interface TwitterErrorResponse {
    error: string;
    error_description?: string;
    detail?: string;
}

interface TwitterMediaUploadResponse {
    media_id: number;
    media_id_string: string;
    size: number;
    expires_after_secs: number;
    image?: {
        image_type: string;
        w: number;
        h: number;
    };
    video?: {
        video_type: string;
    };
}

interface TwitterTweetResponse {
    data: {
        id: string;
        text: string;
    };
    errors?: Array<{
        detail: string;
        title: string;
        resource_type: string;
        parameter: string;
        value: string;
        type: string;
    }>;
}

interface TweetBody {
    text: string;
    media?: {
        media_ids: string[];
    };
}

async function refreshTwitterToken(socialAccount: SocialAccount): Promise<string> {
    if (!socialAccount.refreshToken) {
        throw new Error("Twitter refresh token is missing. User needs to re-authenticate.");
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        throw new Error("Twitter client credentials are not configured.");
    }

    const basicAuth = Buffer.from(
        `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
            refresh_token: socialAccount.refreshToken,
            grant_type: "refresh_token",
            client_id: process.env.TWITTER_CLIENT_ID!,
        }),
    });

    const data: TwitterTokenResponse | TwitterErrorResponse = await response.json();

    if (!response.ok) {
        console.error("Failed to refresh Twitter token:", data);
        const errorData = data as TwitterErrorResponse;
        throw new Error(
            `Could not refresh Twitter token. Reason: ${
                errorData.error_description || errorData.error || "Unknown error"
            }`
        );
    }

    const {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: expiresIn,
    } = data as TwitterTokenResponse;

    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenExpiresAt: newExpiresAt,
        },
    });

    console.log("Successfully refreshed and updated Twitter token");
    return newAccessToken;
}

function isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}

export async function publishToTwitter(
    post: Post & { media?: Media[] }
): Promise<TwitterTweetResponse["data"]> {
    if (!post) {
        throw new Error("Invalid input for publishToTwitter");
    }

    // Find Twitter account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: {
            userId: post.userId,
            socialAccount: {
                platform: "TWITTER",
                brands: {
                    some: {
                        brandId: post.brandId,
                    },
                },
            },
        },
        include: {
            socialAccount: true,
            user: true
        },
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

    // Token refresh
    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshTwitterToken(socialAccount);
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
    // Twitter media upload requires a different approach
    // First, we need to initialize the upload
    const mediaType = getTwitterMediaType(media.type);
    
    // Initialize media upload
    const initResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            command: "INIT",
            total_bytes: "0", // We'll set this properly after fetching the file
            media_type: mediaType,
            media_category: media.type === MediaType.VIDEO ? "tweet_video" : "tweet_image"
        }),
    });

    if (!initResponse.ok) {
        throw new Error(`Failed to initialize media upload: ${await initResponse.text()}`);
    }

    const initData = await initResponse.json();
    const mediaId = initData.media_id_string;

    // Fetch the media file
    const mediaResponse = await fetch(media.url);
    if (!mediaResponse.ok) {
        throw new Error(`Failed to fetch media from URL: ${media.url}`);
    }

    const mediaBuffer = await mediaResponse.arrayBuffer();
    const mediaData = Buffer.from(mediaBuffer);

    // Append media data
    const appendResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "multipart/form-data",
        },
        body: new URLSearchParams({
            command: "APPEND",
            media_id: mediaId,
            media_data: mediaData.toString('base64'),
            segment_index: "0"
        }),
    });

    if (!appendResponse.ok) {
        throw new Error(`Failed to append media data: ${await appendResponse.text()}`);
    }

    // Finalize media upload
    const finalizeResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            command: "FINALIZE",
            media_id: mediaId
        }),
    });

    if (!finalizeResponse.ok) {
        throw new Error(`Failed to finalize media upload: ${await finalizeResponse.text()}`);
    }

    const finalizeData = await finalizeResponse.json();
    
    // Wait for processing if it's a video
    if (media.type === MediaType.VIDEO) {
        let processingInfo = finalizeData.processing_info;
        while (processingInfo && processingInfo.state === 'processing') {
            await new Promise(resolve => setTimeout(resolve, processingInfo.check_after_secs * 1000));
            
            const statusResponse = await fetch("https://upload.twitter.com/1.1/media/upload.json", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    command: "STATUS",
                    media_id: mediaId
                }),
            });

            processingInfo = (await statusResponse.json()).processing_info;
        }

        if (processingInfo && processingInfo.state === 'failed') {
            throw new Error(`Media processing failed: ${processingInfo.error?.message}`);
        }
    }

    return mediaId;
}

function getTwitterMediaType(mediaType: MediaType): string {
    switch (mediaType) {
        case MediaType.IMAGE:
            return "image/jpeg";
        case MediaType.VIDEO:
            return "video/mp4";
        case MediaType.CAROUSEL:
            return "image/jpeg"; // Twitter doesn't support carousels natively
        default:
            return "image/jpeg";
    }
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

    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshTwitterToken(socialAccount);
    }

    const res = await fetch(
        `https://api.x.com/2/tweets?ids=${tweetId}&tweet.fields=public_metrics&expansions=attachments.media_keys&media.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Twitter API failed: ${err}`);
    }

    const data = await res.json();
    return data?.data?.[0]?.public_metrics || null;
}