// lib/youtube-service.ts
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

import { VideoUploadBody } from "@/types/youtube";
import { Post, Media, SocialAccount, MediaType } from "@prisma/client";

export async function publishToYouTube(
    post: Post & { media?: Media[] }
): Promise<{ videoId: string; videoUrl: string; title: string }> {
    if (!post) {
        throw new Error("Invalid input for publishToYouTube");
    }

    // Find YouTube account
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: {
            OR: [
            // Case 1: User personally connected the brand’s LinkedIn account
            {
                userId: post.userId,
                socialAccount: {
                platform: 'YOUTUBE',
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
                platform: 'YOUTUBE',
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
        await handlePostFailure(post, "No connected YouTube account found for this brand");
        throw new Error("User has no connected YouTube account for this brand");
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    // if(await isTokenInvalid(socialAccount.accessToken)){
    //     throw new Error("Access Token Invalid Before");
    // }

    // Refresh token if needed
    let accessToken = socialAccount.accessToken;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }
    
    // if(await isTokenInvalid(accessToken)){
    //     throw new Error("Access Token Invalid After");
    // }

    // Get media
    const media = post.media || await prisma.media.findMany({ 
        where: { postId: post.id } 
    });

    const videoMedia = media.find(m => m.type === MediaType.VIDEO);
    if (!videoMedia) {
        await handlePostFailure(post, "YouTube post requires at least one video");
        throw new Error("YouTube post requires at least one video");
    }

    try {
        // Upload video to YouTube
        const videoId = await uploadVideoToYouTube(
            post.title || extractVideoTitle(post.content), 
            videoMedia, 
            accessToken, 
            post.content,
        );

        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Update post status and record success
        await recordSuccessfulPost(post, socialAccount, videoId, videoUrl);
        
        return {
            videoId,
            videoUrl,
            title: post.title || extractVideoTitle(post.content)
        };

    } catch (error) {
        await handlePostFailure(
            post, 
            error instanceof Error ? error.message : "Unknown upload error"
        );
        throw error;
    }
}

async function uploadVideoToYouTube(
    title: string,
    media: Media, 
    accessToken: string, 
    description: string,
    scheduledFor?: Date | null
): Promise<string> {
    try {
        console.log('Starting YouTube upload process...');
        
        // 1. First, upload the video file using resumable upload
        const videoId = await uploadVideoFile(media, accessToken);
        
        // 2. Then, update the video metadata
        await updateVideoMetadata(title, videoId, accessToken, description, scheduledFor);
        
        console.log('YouTube upload completed successfully:', videoId);
        return videoId;
        
    } catch (error) {
        console.error('YouTube upload error:', error);
        throw new Error(`Failed to upload video to YouTube: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function uploadVideoFile(
    media: Media, 
    accessToken: string
): Promise<string> {
    console.log('Fetching video from URL:', media.url);
    
    // Fetch the video file
    const response = await fetch(media.url);
    if (!response.ok) {
        throw new Error(`Failed to fetch video from URL: ${media.url}. Status: ${response.status}`);
    }

    const videoBuffer = await response.arrayBuffer();
    console.log('Video fetched successfully, size:', videoBuffer.byteLength);

    // Prepare initial metadata for resumable upload
    const initialMetadata = {
        snippet: {
            title: "Uploading...", // Temporary title
            description: "Video is being uploaded...",
            categoryId: "22",
        },
        status: {
            privacyStatus: "private", // Start as private, update later
            selfDeclaredMadeForKids: false
        }
    };

    // Initiate resumable upload session
    console.log('Initiating resumable upload session...');
    const initResponse = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
                "X-Upload-Content-Type": getYouTubeMediaType(media.type),
                "X-Upload-Content-Length": videoBuffer.byteLength.toString(),
            },
            body: JSON.stringify(initialMetadata),
        }
    );

    if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('Upload initiation failed:', errorText);
        throw new Error(`Failed to initiate YouTube upload: ${initResponse.status} - ${errorText}`);
    }

    const uploadUrl = initResponse.headers.get("Location");
    if (!uploadUrl) {
        throw new Error("No upload URL received from YouTube");
    }

    console.log('Upload session created, uploading video data...');

    // Upload the video data
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "Content-Type": getYouTubeMediaType(media.type),
            "Content-Length": videoBuffer.byteLength.toString(),
        },
        body: videoBuffer,
    });

    if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Video upload failed:', errorText);
        throw new Error(`Failed to upload video data: ${uploadResponse.status} - ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    
    if (!uploadData.id) {
        throw new Error("No video ID received from YouTube upload");
    }

    console.log('Video file uploaded successfully, ID:', uploadData.id);
    return uploadData.id;
}

async function updateVideoMetadata(
    title: string,
    videoId: string,
    accessToken: string,
    description: string,
    scheduledFor?: Date | null
): Promise<void> {
    console.log('Updating video metadata for:', videoId);
    
    const videoMetadata: VideoUploadBody = {
        snippet: {
            title: title || extractVideoTitle(description),
            description: description,
            tags: extractTags(description),
            categoryId: "22", // People & Blogs
        },
        status: {
            privacyStatus: scheduledFor ? 'private' : 'public',
            publishAt: scheduledFor ? scheduledFor.toISOString() : undefined,
            selfDeclaredMadeForKids: false
        }
    };

    const updateResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,status`,
        {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: videoId,
                ...videoMetadata
            }),
        }
    );

    if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Metadata update failed:', errorText);
        throw new Error(`Failed to update video metadata: ${updateResponse.status} - ${errorText}`);
    }

    console.log('Video metadata updated successfully');
}

function extractVideoTitle(content: string): string {
    const firstLine = content.split('\n')[0].trim();
    const title = firstLine || "Uploaded Video";
    return title.length > 100 ? title.substring(0, 97) + '...' : title;
}

function extractTags(content: string): string[] {
    const hashtags = content.match(/#(\w+)/g) || [];
    return hashtags.map(tag => tag.substring(1)).slice(0, 10);
}

function getYouTubeMediaType(mediaType: MediaType): string {
    switch (mediaType) {
        case MediaType.VIDEO:
            return "video/*";
        case MediaType.IMAGE:
            return "image/jpeg";
        default:
            return "video/*";
    }
}

async function recordSuccessfulPost(
    post: Post,
    socialAccount: SocialAccount,
    videoId: string,
    videoUrl: string
) {
    
    await prisma.$transaction([
        prisma.post.update({
            where: { id: post.id },
            data: { 
                status: 'PUBLISHED',
                url: videoUrl,
                publishedAt: new Date(),
                updatedAt: new Date()
            }
        }),
        prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_PUBLISHED",
                title: "Video Published on YouTube",
                message: `Your video "${post.title || extractVideoTitle(post.content)}" has been published on YouTube`,
                metadata: {
                    postId: post.id,
                    platform: "YOUTUBE",
                    videoUrl: videoUrl,
                    videoId: videoId,
                }
            }
        })
    ]);

    console.log(`Post ${post.id} 'published' successfully on YouTube`);
}

async function handlePostFailure(post: Post, errorMessage: string) {
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
                title: "YouTube Upload Failed",
                message: `Failed to upload your video to YouTube: ${errorMessage}`,
                metadata: {
                    postId: post.id,
                    platform: "YOUTUBE",
                    error: errorMessage
                }
            }
        })
    ]);

    console.error('YouTube upload failed for post:', post.id, errorMessage);
}

// Analytics and status functions
export async function fetchYouTubeVideoAnalytics(post: Post) {
    if (!post?.userId) throw new Error("Missing userId");

    const videoId = extractVideoIdFromUrl(post.url);
    if (!videoId) throw new Error("Missing or invalid YouTube video URL");

    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: { 
            userId: post.userId, 
            socialAccount: { platform: "YOUTUBE" }
        },
        include: { socialAccount: true }
    });

    if (!userSocialAccount) {
        throw new Error("No connected YouTube account found");
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    let accessToken = socialAccount.accessToken;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }

    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=statistics,snippet,status`,
        { 
            headers: { 
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json"
            } 
        }
    );

    if (!res.ok) {
        throw new Error(`YouTube API failed: ${await res.text()}`);
    }

    const data = await res.json();
    
    if (!data.items || data.items.length === 0) {
        throw new Error("Video not found on YouTube");
    }

    const video = data.items[0];
    return {
        viewCount: parseInt(video.statistics?.viewCount || "0"),
        likeCount: parseInt(video.statistics?.likeCount || "0"),
        commentCount: parseInt(video.statistics?.commentCount || "0"),
        privacyStatus: video.status?.privacyStatus,
        title: video.snippet?.title,
        description: video.snippet?.description,
    };
}

export async function checkYouTubeVideoStatus(post: Post) {
    if (!post.url) throw new Error("Post has no YouTube URL");

    const videoId = extractVideoIdFromUrl(post.url);
    if (!videoId) throw new Error("Invalid YouTube URL");

    const userSocialAccount = await prisma.userSocialAccount.findFirst({
        where: { 
            userId: post.userId, 
            socialAccount: { platform: "YOUTUBE" }
        },
        include: { socialAccount: true }
    });

    if (!userSocialAccount) {
        throw new Error("No connected YouTube account found");
    }

    const socialAccount = userSocialAccount.socialAccount;
    let accessToken = socialAccount.accessToken;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }

    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=status`,
        { 
            headers: { 
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json"
            } 
        }
    );

    if (!res.ok) {
        throw new Error(`YouTube API failed: ${await res.text()}`);
    }

    const data = await res.json();
    return data.items?.[0]?.status || null;
}

function extractVideoIdFromUrl(url: string | null): string | null {
    if (!url) return null;
    
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('v') || url.split('/').pop() || null;
    } catch {
        return url.split('v=')[1]?.split('&')[0] || null;
    }
}

// Utility function to test YouTube connection
export async function testYouTubeConnection(accessToken: string): Promise<boolean> {
    try {
        const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            }
        );

        if (response.status === 401) {
            throw new Error('Invalid or expired access token');
        }

        if (!response.ok) {
            throw new Error(`YouTube API error: ${response.status}`);
        }

        const data = await response.json();
        return !!data.items && data.items.length > 0;
    } catch (error) {
        console.error('YouTube connection test failed:', error);
        throw error;
    }
}

export async function getYouTubeAnalytics(socialAccount: SocialAccount) {
  // Create auth client using stored tokens
  const access_token = await decryptToken(socialAccount.accessToken);
  const refresh_token = socialAccount.refreshToken ? await decryptToken(socialAccount.refreshToken) : undefined;

  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({
    access_token: access_token,
    refresh_token: refresh_token,
    expiry_date: socialAccount.tokenExpiresAt?.getTime(),
  });

  try {
    // First, fetch the channel ID using YouTube Data API
    const youtube = google.youtube({
      version: 'v3',
      auth: authClient
    });

    const channelResponse = await youtube.channels.list({
      part: ['id'],
      mine: true
    });

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    const channelId = channelResponse.data.items[0].id;
    if (!channelId) {
      throw new Error('Failed to retrieve channel ID');
    }

    // Setup YouTube Analytics client
    const youtubeAnalytics = google.youtubeAnalytics({
      version: 'v2',
      auth: authClient
    });

    // Calculate date range (last 30 days)
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const response = await youtubeAnalytics.reports.query({
      ids: `channel=${channelId}`,
      startDate: startDate,
      endDate: endDate,
      metrics: 'views,estimatedMinutesWatched,subscribersGained,likes,comments,shares',
      dimensions: 'day',
      sort: 'day'
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching YouTube analytics:', error);
    throw error;
  }
}

export async function getChannelStatistics(socialAccount: SocialAccount) {
  // Create auth client using stored tokens
  const access_token = await decryptToken(socialAccount.accessToken);
  const refresh_token = socialAccount.refreshToken ? await decryptToken(socialAccount.refreshToken) : undefined;

  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({
    access_token: access_token,
    refresh_token: refresh_token,
    expiry_date: socialAccount.tokenExpiresAt?.getTime(),
  });

  // Setup YouTube Data API client
  const youtube = google.youtube({
    version: 'v3',
    auth: authClient
  });

  try {
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails', 'brandingSettings'],
      mine: true
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    return response.data.items[0];
  } catch (error) {
    console.error('Error fetching channel statistics:', error);
    throw error;
  }
}