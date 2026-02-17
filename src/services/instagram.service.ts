// lib/social/instagram.ts
import { prisma } from "@/lib/prisma";
import { updateCalendarItemStatus } from "@/utils/calendar-status-updater";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired } from "@/utils/token";
import { Post, Media } from "@prisma/client";

interface InstagramPostResponse {
  id: string;
  permalink?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

interface InstagramContainerResponse {
  id: string;
  status?: string;
  status_code?: string;
}

export async function publishToInstagram(
  post: Post & { media?: Media[] }
): Promise<InstagramPostResponse> {
  try {
    if (!post) throw new Error('Invalid input');

    // Find Instagram account through user junction table (similar to Twitter approach)
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        OR: [
          // Case 1: User personally connected the brand's Instagram account
          {
            userId: post.userId,
            socialAccount: {
              platform: 'INSTAGRAM',
              brands: {
                some: {
                  brandId: post.brandId
                }
              }
            }
          },
          // Case 2: Another user connected the Instagram account, but it's linked to the same brand
          {
            socialAccount: {
              platform: 'INSTAGRAM',
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

    console.log("Found user social account:", userSocialAccount);

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
          message: "Failed to publish your post on Instagram - no connected account for this brand",
          metadata: {
            postId: post.id,
            platform: "INSTAGRAM"
          }
        }
      });

      throw new Error('No Instagram account connected to this brand');
    }

    const socialAccount = userSocialAccount.socialAccount;
    const accessToken = await decryptToken(socialAccount.accessToken);
    let refreshToken = null;
    if (socialAccount.refreshToken) {
      refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      throw new Error('Instagram token is expired');
    }

    // 3. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
      where: { postId: post.id }
    });

    // 5. Handle different post types based on media
    let responseData: InstagramPostResponse;
    
    if (media.length === 0) {
      // Text-only post (Instagram doesn't support pure text posts)
      throw new Error('Instagram requires media for posts. Please add at least one image or video.');
    } else if (media.length === 1 && media[0].type === 'IMAGE') {
      // Single image post
      responseData = await createInstagramPhotoPost(socialAccount.platformUserId, accessToken, post, media[0]);
    } else if (media.length === 1 && media[0].type === 'VIDEO') {
      // Single video post
      responseData = await createInstagramVideoPost(socialAccount.platformUserId, accessToken, post, media[0]);
    } else if (media.length > 1 && media.every(m => m.type === 'IMAGE')) {
      // Multiple images (carousel)
      responseData = await createInstagramCarouselPost(socialAccount.platformUserId, accessToken, post, media);
    } else {
      // Mixed media types - fallback to first media item
      const firstMedia = media[0];
      if (firstMedia.type === 'IMAGE') {
        responseData = await createInstagramPhotoPost(socialAccount.platformUserId, accessToken, post, firstMedia);
      } else if (firstMedia.type === 'VIDEO') {
        responseData = await createInstagramVideoPost(socialAccount.platformUserId, accessToken, post, firstMedia);
      } else {
        throw new Error('Unsupported media type for Instagram');
      }
    }

    // 6. Record successful post
    if (responseData.id && !responseData.error) {
      await recordSuccessfulInstagramPost(post, socialAccount.id, responseData.id, responseData.permalink);
    } else {
      throw new Error(responseData.error?.message || 'Instagram API returned an error');
    }

    return responseData;
  } catch (error) {
    console.error("Error in publishing to Instagram:", error);
    
    // Update post status to failed
    await prisma.post.update({
      where: { id: post.id },
      data: { 
        status: "FAILED",
        updatedAt: new Date()
      }
    });

    // Create error notification
    await prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_FAILED",
        title: "Post Failed",
        message: `Failed to publish your post on Instagram: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          postId: post.id,
          platform: "INSTAGRAM"
        }
      }
    });

    throw error;
  }
}

async function createInstagramPhotoPost(
  instagramAccountId: string,
  accessToken: string,
  post: Post,
  media: Media
): Promise<InstagramPostResponse> {
  console.log('Creating Instagram photo post...', { instagramAccountId, mediaId: media.id });

  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.instagram.com/v19.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: media.url,
        caption: post.content,
        access_token: accessToken
      })
    }
  );

  const containerData: InstagramContainerResponse = await containerResponse.json();

  if (!containerResponse.ok || !containerData.id) {
    throw new Error(`Failed to create media container: ${JSON.stringify(containerData)}`);
  }

  // Step 2: Wait for container to be ready and publish it
  return await publishMediaContainer(instagramAccountId, accessToken, containerData.id);
}

async function createInstagramVideoPost(
  instagramAccountId: string,
  accessToken: string,
  post: Post,
  media: Media
): Promise<InstagramPostResponse> {
  console.log('Creating Instagram video post...', { instagramAccountId, mediaId: media.id });

  // Step 1: Create media container
  const containerResponse = await fetch(
    `https://graph.instagram.com/v19.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_url: media.url,
        caption: post.content,
        media_type: 'REELS',
        access_token: accessToken
      })
    }
  );

  const containerData: InstagramContainerResponse = await containerResponse.json();

  if (!containerResponse.ok || !containerData.id) {
    throw new Error(`Failed to create video container: ${JSON.stringify(containerData)}`);
  }

  // Step 2: Wait for container to be ready and publish it
  return await publishMediaContainer(instagramAccountId, accessToken, containerData.id);
}

async function createInstagramCarouselPost(
  instagramAccountId: string,
  accessToken: string,
  post: Post,
  media: Media[]
): Promise<InstagramPostResponse> {
  console.log('Creating Instagram carousel post...', { instagramAccountId, mediaCount: media.length });

  // Step 1: Create individual media containers for each image
  const mediaContainerIds: string[] = [];
  
  for (const mediaItem of media) {
    if (mediaItem.type !== 'IMAGE') {
      throw new Error('Carousel posts currently only support images');
    }

    const containerResponse = await fetch(
      `https://graph.instagram.com/v19.0/${instagramAccountId}/media`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: mediaItem.url,
          is_carousel_item: true,
          access_token: accessToken
        })
      }
    );

    const containerData: InstagramContainerResponse = await containerResponse.json();

    if (!containerResponse.ok || !containerData.id) {
      throw new Error(`Failed to create carousel item container: ${JSON.stringify(containerData)}`);
    }

    mediaContainerIds.push(containerData.id);
  }

  // Step 2: Create carousel container
  const carouselResponse = await fetch(
    `https://graph.instagram.com/v19.0/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caption: post.content,
        media_type: 'CAROUSEL',
        children: mediaContainerIds.join(','),
        access_token: accessToken
      })
    }
  );

  const carouselData: InstagramContainerResponse = await carouselResponse.json();

  if (!carouselResponse.ok || !carouselData.id) {
    throw new Error(`Failed to create carousel container: ${JSON.stringify(carouselData)}`);
  }

  // Step 3: Wait for carousel container to be ready and publish it
  return await publishMediaContainer(instagramAccountId, accessToken, carouselData.id);
}

async function publishMediaContainer(
  instagramAccountId: string,
  accessToken: string,
  containerId: string,
  maxRetries: number = 10,
  delayMs: number = 2000
): Promise<InstagramPostResponse> {
  // Wait for container to be ready (Instagram processes media asynchronously)
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Check container status
    const statusResponse = await fetch(
      `https://graph.instagram.com/v19.0/${containerId}?fields=status_code,status&access_token=${accessToken}`
    );

    const statusData: InstagramContainerResponse = await statusResponse.json();

    if (statusData.status_code === 'FINISHED') {
      // Container is ready, publish it
      const publishResponse = await fetch(
        `https://graph.instagram.com/v19.0/${instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken
          })
        }
      );

      const publishData: InstagramPostResponse = await publishResponse.json();

      if (!publishResponse.ok) {
        throw new Error(`Failed to publish media: ${JSON.stringify(publishData)}`);
      }

      // Get the permalink for the published post
      if (publishData.id) {
        const postInfoResponse = await fetch(
          `https://graph.instagram.com/v19.0/${publishData.id}?fields=permalink&access_token=${accessToken}`
        );
        
        const postInfo = await postInfoResponse.json();
        publishData.permalink = postInfo.permalink;
      }

      return publishData;
    } else if (statusData.status_code === 'ERROR') {
      throw new Error(`Media processing failed: ${statusData.status || 'Unknown error'}`);
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  throw new Error('Media container processing timeout');
}

async function recordSuccessfulInstagramPost(
  post: Post,
  socialAccountId: string,
  postId: string,
  permalink?: string
) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: permalink || `https://instagram.com/p/${postId}`,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on Instagram",
        metadata: {
          postId: post.id,
          platform: "INSTAGRAM",
          postUrl: permalink || `https://instagram.com/p/${postId}`
        }
      }
    })
  ]);

  // Update calendar item status if applicable
  await updateCalendarItemStatus(post.id);
}

// Utility function to refresh Instagram token if needed
export async function refreshInstagramToken(currentToken: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
}> {
  const response = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to refresh Instagram token: ${errorData.error?.message || 'Unknown error'}`);
  }

  return await response.json();
}