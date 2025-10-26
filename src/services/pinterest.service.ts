import { prisma } from "@/lib/prisma";
import { Post, Media } from "@prisma/client";
import { isTokenExpired } from "@/utils/token";
import { decryptToken } from "@/lib/encryption";

interface PinterestPinData {
  title?: string;
  description?: string;
  link?: string;
  alt_text?: string;
  board_id: string;
  media_source: {
    source_type: "image_url" | "video_url";
    url: string;
    content_type: string;
  };
}

interface PinterestPinResponse {
  id: string;
  title?: string;
  description?: string;
  board_id: string;
  media: {
    images?: {
      [key: string]: { url: string; width: number; height: number };
    };
  };
  dominant_color: string;
  alt_text?: string;
  link?: string;
  url: string;
  created_at: string;
}

interface PinterestBoard {
  id: string;
  name: string;
  description?: string;
  privacy: "PUBLIC" | "PROTECTED" | "SECRET";
}

interface PinterestUserAccount {
  username: string;
  website?: string;
  account_type: "BUSINESS" | "PATNER" | "PERSONAL";
}

interface PinterestAnalyticsMetric {
  metric_type: string;
  value: number;
}

interface PinterestAnalyticsResponse {
  all?: {
    metrics?: PinterestAnalyticsMetric[];
  };
}

export async function publishToPinterest(
  post: Post & { media?: Media[] },
  boardId?: string
): Promise<{ id: string }> {
  try {
    if (!post) throw new Error('Invalid input');

    // 1. Get Pinterest account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        OR: [
          // Case 1: User personally connected the brand's Pinterest account
          {
            userId: post.userId,
            socialAccount: {
              platform: 'PINTEREST',
              brands: {
                some: {
                  brandId: post.brandId
                }
              }
            }
          },
          // Case 2: Another user connected the Pinterest account, but it's linked to the same brand
          {
            socialAccount: {
              platform: 'PINTEREST',
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
          message: "Failed to publish your post on Pinterest - no connected account for this brand",
          metadata: {
            postId: post.id,
            platform: "PINTEREST"
          }
        }
      });

      throw new Error('User has no connected Pinterest account for this brand');
    }

    const socialAccount = userSocialAccount.socialAccount;
    const accessToken = await decryptToken(socialAccount.accessToken);
    
    if (socialAccount.refreshToken) {
      await decryptToken(socialAccount.refreshToken);
    }

    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      throw new Error('Pinterest token is expired');
    }

    // 2. Get user's boards to select one if not provided
    let targetBoardId = boardId;
    if (!targetBoardId) {
      const boards = await getUserBoards(accessToken);
      if (boards.length === 0) {
        throw new Error('No Pinterest boards found. Please create a board first.');
      }
      // Use the first board or implement board selection logic
      targetBoardId = boards[0].id;
    }

    // 3. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
      where: { postId: post.id }
    });

    if (media.length === 0) {
      throw new Error('Pinterest requires at least one image or video');
    }

    // 4. Create pin on Pinterest
    const pinData = await createPinterestPin(
      post,
      media[0], // Pinterest typically uses one main image/video per pin
      targetBoardId,
      accessToken
    );

    // 5. Record successful post
    await recordSuccessfulPinterestPost(post, socialAccount.id, pinData.id, pinData.url);
    
    return { id: pinData.id };
  } catch (error) {
    console.error("Error in publishing to Pinterest:", error);
    await handlePinterestPostFailure(post, error);
    throw error;
  }
}

export async function getUserBoards(accessToken: string): Promise<PinterestBoard[]> {
  try {
    const response = await fetch('https://api.pinterest.com/v5/boards', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch boards: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching Pinterest boards:', error);
    throw error;
  }
}

export async function getUserAccount(accessToken: string): Promise<PinterestUserAccount> {
  try {
    const response = await fetch('https://api.pinterest.com/v5/user_account', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user account: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Pinterest user account:', error);
    throw error;
  }
}

async function createPinterestPin(
  post: Post,
  media: Media,
  boardId: string,
  accessToken: string
): Promise<PinterestPinResponse> {
  try {
    console.log("Access token:", accessToken);
    // Determine media type and content type
    const mediaType = getMediaType(media.url);
    const contentType = getContentType(media.url);

    const pinData: PinterestPinData = {
      title: post.content.substring(0, 100), // Pinterest titles are typically short
      description: post.content,
      link: post.url || undefined, // Optional link for the pin
      board_id: boardId,
      media_source: {
        source_type: mediaType === 'video' ? 'video_url' : 'image_url',
        url: media.url,
        content_type: contentType,
      },
    };

    // Remove undefined fields
    const cleanPinData = Object.fromEntries(
      Object.entries(pinData).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch('https://api-sandbox.pinterest.com/v5/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanPinData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Pinterest API error details:', responseData);
      throw new Error(`Pinterest API error: ${responseData.message || JSON.stringify(responseData)}`);
    }

    return responseData;
  } catch (error) {
    console.error('Error creating Pinterest pin:', error);
    throw error;
  }
}

function getMediaType(url: string): 'image' | 'video' {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
  
  const lowerUrl = url.toLowerCase();
  
  if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'image';
  }
  
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return 'video';
  }
  
  // Default to image if unknown
  return 'image';
}

function getContentType(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase();
  
  const contentTypes: { [key: string]: string } = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
  };
  
  return contentTypes[extension || ''] || 'image/jpeg';
}

async function recordSuccessfulPinterestPost(
  post: Post,
  socialAccountId: string,
  pinId: string,
  pinUrl: string
) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: pinUrl,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on Pinterest",
        metadata: {
          postId: post.id,
          platform: "PINTEREST",
          postUrl: pinUrl,
          pinId: pinId
        }
      }
    })
  ]);
}

async function handlePinterestPostFailure(
  post: Post,
  errorData: unknown
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
        message: "Failed to publish your post on Pinterest",
        metadata: {
          postId: post.id,
          platform: "PINTEREST",
          error: errorData instanceof Error ? errorData.message : 'Unknown error'
        }
      }
    })
  ]);
}

// Analytics functions for Pinterest
interface PinterestAnalyticsData {
  pin_id: string;
  pin_url: string;
  fetched_at: string;
  metrics?: {
    impression_count?: number;
    save_count?: number;
    pin_click_count?: number;
    outbound_click_count?: number;
  };
  summary: {
    impressions: number | string;
    saves: number | string;
    clicks: number | string;
    outbound_clicks: number | string;
  };
}

export async function fetchPinterestPinAnalytics(post: Post): Promise<PinterestAnalyticsData> {
  if (!post?.userId || !post?.url) {
    throw new Error("Missing userId or post URL");
  }

  // Extract pin ID from URL
  const pinIdMatch = post.url.match(/pinterest\.com\/pin\/([^\/]+)/);
  if (!pinIdMatch) {
    throw new Error("Invalid Pinterest pin URL format");
  }
  const pinId = pinIdMatch[1];

  // Get Pinterest account
  const userSocialAccount = await prisma.userSocialAccount.findFirst({
    where: {
      userId: post.userId,
      socialAccount: {
        platform: 'PINTEREST',
        brands: {
          some: {
            brandId: post.brandId
          }
        }
      }
    },
    include: {
      socialAccount: true
    }
  });

  if (!userSocialAccount) {
    throw new Error("No connected Pinterest account found");
  }

  const accessToken = await decryptToken(userSocialAccount.socialAccount.accessToken);

  if (isTokenExpired(userSocialAccount.socialAccount.tokenExpiresAt)) {
    throw new Error("Pinterest token is expired");
  }

  try {
    // Get pin details
    const pinResponse = await fetch(
      `https://api.pinterest.com/v5/pins/${pinId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!pinResponse.ok) {
      throw new Error(`Failed to fetch pin details: ${pinResponse.statusText}`);
    }

    const pinData: PinterestPinResponse = await pinResponse.json();

    // Get analytics for the pin
    const analyticsResponse = await fetch(
      `https://api.pinterest.com/v5/pins/${pinId}/analytics?metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    const analyticsData: PinterestAnalyticsData = {
      pin_id: pinId,
      pin_url: post.url,
      fetched_at: new Date().toISOString(),
      summary: {
        impressions: 'Not available',
        saves: 'Not available',
        clicks: 'Not available',
        outbound_clicks: 'Not available'
      }
    };

    if (analyticsResponse.ok) {
      const analytics: PinterestAnalyticsResponse = await analyticsResponse.json();
      
      if (analytics.all?.metrics) {
        analyticsData.metrics = {
          impression_count: analytics.all.metrics.find((m: PinterestAnalyticsMetric) => m.metric_type === 'IMPRESSION')?.value,
          save_count: analytics.all.metrics.find((m: PinterestAnalyticsMetric) => m.metric_type === 'SAVE')?.value,
          pin_click_count: analytics.all.metrics.find((m: PinterestAnalyticsMetric) => m.metric_type === 'PIN_CLICK')?.value,
          outbound_click_count: analytics.all.metrics.find((m: PinterestAnalyticsMetric) => m.metric_type === 'OUTBOUND_CLICK')?.value,
        };

        analyticsData.summary = {
          impressions: analyticsData.metrics.impression_count || 0,
          saves: analyticsData.metrics.save_count || 0,
          clicks: analyticsData.metrics.pin_click_count || 0,
          outbound_clicks: analyticsData.metrics.outbound_click_count || 0,
        };
      }
    }

    return analyticsData;

  } catch (error) {
    console.error('Error fetching Pinterest analytics:', error);
    throw new Error(`Failed to fetch Pinterest pin analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Utility function to refresh Pinterest token if needed
export async function refreshPinterestToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const response = await fetch('https://api.pinterest.com/v5/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.PINTEREST_APP_ID}:${process.env.PINTEREST_APP_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh Pinterest token');
  }

  return await response.json();
}