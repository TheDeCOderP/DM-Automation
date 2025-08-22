import { prisma } from "@/lib/prisma";
import { Post, Media } from "@prisma/client";

interface LinkedInMedia {
  status: string;
  description: {
    text: string;
  };
  media: string;
  title: {
    text: string;
  };
}

interface LinkedInShareContent {
  shareCommentary: {
    text: string;
  };
  shareMediaCategory: string;
  media?: LinkedInMedia[];
}

interface LinkedInPostBody {
  author: string;
  lifecycleState: string;
  specificContent: {
    'com.linkedin.ugc.ShareContent': LinkedInShareContent;
  };
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': string;
  };
}

interface LinkedInUploadResponse {
  value: {
    uploadMechanism: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
        uploadUrl: string;
      };
    };
    asset: string;
  };
}

export async function publishToLinkedin(
  post: Post & { media?: Media[] }
): Promise<{ id: string }> {
  try {
    if (!post) throw new Error('Invalid input');

    // 1. Get LinkedIn account with user relation for notifications
    const socialAccount = await prisma.socialAccount.findUnique({
      where: {
        userId_platform_brandId: {
          userId: post.userId,
          platform: 'LINKEDIN',
          brandId: post.brandId
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
          message: "Failed to publish your post on LinkedIn - no connected account",
          metadata: {
            postId: post.id,
            platform: "LINKEDIN"
          }
        }
      });

      throw new Error('User has no connected LinkedIn account');
    }
  
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      throw new Error('LinkedIn token is expired');
    }

    const authorUrn = `urn:li:person:${socialAccount.platformUserId}`;
    let assetUrn: string | null = null;

    // 2. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
      where: { postId: post.id }
    });

    // 3. Handle media upload if provided (LinkedIn only supports one image per post)
    if (media.length > 0) {
      try {
        // LinkedIn only supports one image per post, so we'll use the first one
        const firstMedia = media[0];
        assetUrn = await uploadMediaToLinkedin(firstMedia, socialAccount.accessToken, authorUrn);
      } catch (error) {
        console.error('Media upload failed:', error);
        // Optionally proceed with text-only post if media fails
        // throw error; // Uncomment to fail the entire post if media upload fails
      }
    }

    // 4. Create post body
    const postBody: LinkedInPostBody = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: post.content,
          },
          shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE',
          ...(assetUrn ? {
            media: [{
              status: 'READY',
              description: { text: 'Post image' },
              media: assetUrn,
              title: { text: 'Post image' }
            }]
          } : {})
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    // 5. Post to LinkedIn
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${socialAccount.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202402'
      },
      body: JSON.stringify(postBody)
    });

    const data = await response.json();

    if (!response.ok) {
      await handleLinkedInPostFailure(post, data);
      throw new Error(`LinkedIn API error: ${JSON.stringify(data)}`);
    }

    // 6. Record successful post
    await recordSuccessfulLinkedInPost(post, socialAccount, data.id);
    return data;
  } catch (error) {
    console.error("Error in publishing to LinkedIn:", error);
    throw error;
  }
}

async function uploadMediaToLinkedin(
  media: Media,
  accessToken: string,
  authorUrn: string
): Promise<string> {
  try {
    // 1. Get the media file from URL
    const response = await fetch(media.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media from URL: ${media.url}`);
    }

    const blob = await response.blob();

    // 2. Register upload with LinkedIn
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202402'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: authorUrn,
          serviceRelationships: [{
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent'
          }]
        }
      })
    });

    if (!registerResponse.ok) {
      throw new Error(`Failed to register upload: ${registerResponse.statusText}`);
    }

    const registerData: LinkedInUploadResponse = await registerResponse.json();
    const uploadUrl = registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
    const asset = registerData.value.asset;

    // 3. Upload media to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': blob.type
      },
      body: blob
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload media: ${uploadResponse.statusText}`);
    }

    return asset;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw error;
  }
}

async function recordSuccessfulLinkedInPost(
  post: Post,
  socialAccount: { id: string },
  postId: string
) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: `https://www.linkedin.com/feed/update/${postId}`,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on LinkedIn",
        metadata: {
          postId: post.id,
          platform: "LINKEDIN",
          postUrl: `https://www.linkedin.com/feed/update/${postId}`
        }
      }
    })
  ]);
}

async function handleLinkedInPostFailure(
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
        message: "Failed to publish your post on LinkedIn",
        metadata: {
          postId: post.id,
          platform: "LINKEDIN",
          error: errorData || 'Unknown error'
        }
      }
    })
  ]);
}

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 300000); // 5 minute buffer
}