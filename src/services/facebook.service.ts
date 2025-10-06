// lib/social/facebook.ts
import { prisma } from "@/lib/prisma";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired } from "@/utils/token";
import { Post, Media, Platform } from "@prisma/client";

interface FacebookPostResponse {
  id: string;
  post_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

export async function publishToFacebook(
  post: Post & { media?: Media[] }
): Promise<FacebookPostResponse> {
  try {
    if (!post) throw new Error('Invalid input');

    // 1. Get Facebook account through user relation
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        OR: [
          // Case 1: User personally connected the brand’s LinkedIn account
          {
            userId: post.userId,
            socialAccount: {
              platform: 'FACEBOOK',
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
              platform: 'FACEBOOK',
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
          message: "Failed to publish your post on Facebook - no connected account",
          metadata: {
            postId: post.id,
            platform: "FACEBOOK"
          }
        }
      });

      throw new Error('User has no connected Facebook account for this brand');
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
      socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      throw new Error('Facebook token is expired');
    }

    // 2. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
      where: { postId: post.id }
    });

    // 3. Determine the target (page or user profile)
    if (!post.pageTokenId) {
      throw new Error('Page ID is required');
    }
    
    const pageToken = await prisma.pageToken.findFirst({
      where: {
        id: post.pageTokenId,
        socialAccountId: socialAccount.id,
      },
    });

    const targetId = pageToken?.pageId;
    if (targetId == undefined) {
      throw new Error('Page ID is missing');
    }

    const page_access_token = pageToken?.accessToken;
    if (page_access_token == undefined) {
      throw new Error('Page access token is missing');
    }

    // 4. Handle different post types based on media
    let responseData: FacebookPostResponse;
    if (media.length === 0) {
      // Text-only post
      responseData = await createTextPost(targetId, page_access_token, post);
    } else if (media.length === 1 && media[0].type === 'IMAGE') {
      // Single image post
      responseData = await createPhotoPost(targetId, page_access_token, post, media[0]);
    } else if (media.length === 1 && media[0].type === 'VIDEO') {
      // Video post
      responseData = await createVideoPost(targetId, page_access_token, post, media[0]);
    } else {
      // Multiple media items (album) or unsupported types - fallback to text with link
      responseData = await createTextPost(targetId, page_access_token, post);
    }

    // 5. Record successful post
    if (responseData.id && !responseData.error) {
      await recordSuccessfulFacebookPost(post, socialAccount.id, responseData.id);
    } else {
      throw new Error(responseData.error?.message || 'Facebook API returned an error');
    }

    return responseData;
  } catch (error) {
    console.error("Error in publishing to Facebook:", error);
    throw error;
  }
}

export async function getFacebookPageAccessToken(
  userAccessToken: string,
  pageId: string
){
  try {
    const url = `https://graph.facebook.com/${pageId}?fields=access_token,name&access_token=${userAccessToken}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Facebook API Error: ${errorData.error?.message || 'Unknown error'}`
      );
    }
    
    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access token returned from Facebook');
    }
    
    return data.access_token;
    
  } catch (error) {
    console.error('Failed to get page access token:', error);
    throw new Error(
      `Failed to retrieve page access token: ${error}`
    );
  }
}

async function createTextPost(
  targetId: string,
  accessToken: string,
  post: Post
): Promise<FacebookPostResponse> {
  console.log('Creating text post...', targetId, accessToken, post);
  const response = await fetch(`https://graph.facebook.com/v19.0/${targetId}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: post.content || post.content,
      access_token: accessToken
    })
  });

  return await response.json();
}

async function createPhotoPost(
  targetId: string,
  accessToken: string,
  post: Post,
  media: Media
): Promise<FacebookPostResponse> {
  // First upload the photo
  const photoUrl = `https://graph.facebook.com/v19.0/${targetId}/photos`;
  
  const formData = new FormData();
  formData.append('access_token', accessToken);
  formData.append('message', post.content || post.content);
  
  // Fetch the image from URL and append to form data
  const imageResponse = await fetch(media.url);
  const blob = await imageResponse.blob();
  formData.append('source', blob);

  const uploadResponse = await fetch(photoUrl, {
    method: 'POST',
    body: formData
  });

  return await uploadResponse.json();
}

async function createVideoPost(
  targetId: string,
  accessToken: string,
  post: Post,
  media: Media
): Promise<FacebookPostResponse> {
  // Facebook video upload is a 3-step process
  // 1. Create upload session
  const uploadSessionResponse = await fetch(
    `https://graph.facebook.com/v19.0/${targetId}/videos?upload_phase=start&access_token=${accessToken}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        //file_size: media.size || 0, // You might want to store file size in your Media model
        title: post.content || 'Video post',
        description: post.content
      })
    }
  );

  const sessionData = await uploadSessionResponse.json();
  if (!sessionData.upload_session_id || !sessionData.video_id) {
    throw new Error('Failed to create Facebook video upload session');
  }

  // 2. Upload the video chunks (simplified - in reality you'd need to handle chunking)
  const videoResponse = await fetch(media.url);
  const videoBlob = await videoResponse.blob();

  const uploadResponse = await fetch(
    `https://graph.facebook.com/v19.0/${targetId}/videos?upload_phase=transfer&access_token=${accessToken}&upload_session_id=${sessionData.upload_session_id}`,
    {
      method: 'POST',
      body: videoBlob
    }
  );

  const uploadData = await uploadResponse.json();
  if (uploadData.error) {
    throw new Error(uploadData.error.message);
  }

  // 3. Finish the upload
  const finishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${targetId}/videos?upload_phase=finish&access_token=${accessToken}&upload_session_id=${sessionData.upload_session_id}&video_id=${sessionData.video_id}`,
    {
      method: 'POST'
    }
  );

  return await finishResponse.json();
}

async function recordSuccessfulFacebookPost(
  post: Post,
  socialAccountId: string,
  postId: string
) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: `https://facebook.com/${postId}`,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on Facebook",
        metadata: {
          postId: post.id,
          platform: "FACEBOOK",
          postUrl: `https://facebook.com/${postId}`
        }
      }
    })
  ]);
}