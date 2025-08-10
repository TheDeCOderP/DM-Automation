import { prisma } from "@/lib/prisma";
import { Post, Media, SocialAccount } from "@prisma/client";

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
        throw new Error('Twitter refresh token is missing. User needs to re-authenticate.');
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        throw new Error('Twitter client credentials are not configured.');
    }

    const basicAuth = Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64');

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${basicAuth}`
        },
        body: new URLSearchParams({
            'refresh_token': socialAccount.refreshToken,
            'grant_type': 'refresh_token',
            'client_id': process.env.TWITTER_CLIENT_ID,
        })
    });

    const data: TwitterTokenResponse | TwitterErrorResponse = await response.json();

    if (!response.ok) {
        console.error('Failed to refresh Twitter token:', data);
        await prisma.socialAccount.update({
            where: { id: socialAccount.id },
            data: { isConnected: false }
        });
        const errorData = data as TwitterErrorResponse;
        throw new Error(`Could not refresh Twitter token. Reason: ${errorData.error_description || errorData.error || 'Unknown error'}`);
    }

    const { access_token: newAccessToken, refresh_token: newRefreshToken, expires_in: expiresIn } = data as TwitterTokenResponse;

    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await prisma.socialAccount.update({
        where: { id: socialAccount.id },
        data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            tokenExpiresAt: newExpiresAt,
        },
    });

    console.log('Successfully refreshed and updated Twitter token');
    return newAccessToken;
}

export async function publishToTwitter(post: Post & { media?: Media[] }): Promise<TwitterTweetResponse['data']> {
    if (!post) {
        throw new Error('Invalid input for publishToTwitter');
    }

    // 1. Get Twitter account with user relation for notifications
    const socialAccount = await prisma.socialAccount.findUnique({
        where: {
            userId_platform: {
                userId: post.userId,
                platform: 'TWITTER'
            },
            isConnected: true
        },
        include: {
            user: true
        }
    });

    if (!socialAccount) {
        // Update post status to failed if no connected account
        await prisma.post.update({
            where: { id: post.id },
            data: { 
                status: "FAILED",
                updatedAt: new Date()
            }
        });

        // Create notification for the user
        await prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_FAILED",
                title: "Post Failed",
                message: `Failed to publish your post on Twitter - no connected account`,
                metadata: {
                    postId: post.id,
                    platform: "TWITTER"
                }
            }
        });

        throw new Error('User has no connected Twitter account');
    }

    // 2. Handle token refresh if needed
    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshTwitterToken(socialAccount);
    }

    // 3. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
        where: { postId: post.id }
    });

    // 4. Prepare tweet body
    const tweetBody: TweetBody = {
        text: post.caption || post.content,
    };

    // 5. Handle media upload if provided
    if (media.length > 0) {
        try {
            const mediaIds = await Promise.all(
                media.map(m => uploadMediaToTwitter(m, accessToken))
            );
            tweetBody.media = { media_ids: mediaIds };
        } catch (error) {
            console.error('Media upload failed:', error);
            // Optionally proceed with text-only tweet if media fails
            // throw error; // Uncomment to fail the entire post if media upload fails
        }
    }

    // 6. Post the tweet
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(tweetBody)
    });

    const data: TwitterTweetResponse = await tweetResponse.json();

    if (!tweetResponse.ok) {
        await handleTwitterPostFailure(post, socialAccount, data);
        throw new Error(`Twitter API error: ${data.errors?.[0]?.detail || 'Unknown error'}`);
    }

    // 7. Record successful post
    await recordSuccessfulPost(post, socialAccount, data.data.id);
    return data.data;
}

async function uploadMediaToTwitter(media: Media, accessToken: string): Promise<string> {
    // 1. Get the media file from URL
    const response = await fetch(media.url);
    if (!response.ok) {
        throw new Error(`Failed to fetch media from URL: ${media.url}`);
    }

    const blob = await response.blob();
    const formData = new FormData();
    formData.append('media', blob);

    // 2. Upload to Twitter
    const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
        },
        body: formData
    });

    const uploadData: TwitterMediaUploadResponse = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadData.media_id_string) {
        throw new Error(`Failed to upload media to Twitter: ${JSON.stringify(uploadData)}`);
    }

    return uploadData.media_id_string;
}

async function recordSuccessfulPost(
    post: Post,
    socialAccount: { id: string },
    tweetId: string
) {
    await prisma.$transaction([
        prisma.post.update({
            where: { id: post.id },
            data: { 
                status: 'PUBLISHED',
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
    socialAccount: { id: string, user: { id: string } },
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

function isTokenExpired(expiresAt: Date | null): boolean {
    if (!expiresAt) return true;
    return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}