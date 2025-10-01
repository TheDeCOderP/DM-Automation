import { decryptToken } from "@/lib/encryption";
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

    // 1. Get LinkedIn account through user junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId: post.userId,
        socialAccount: {
          platform: 'LINKEDIN',
          brands: {
            some: {
              brandId: post.brandId
            }
          }
        }
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
          message: "Failed to publish your post on LinkedIn - no connected account for this brand",
          metadata: {
            postId: post.id,
            platform: "LINKEDIN"
          }
        }
      });

      throw new Error('User has no connected LinkedIn account for this brand');
    }

    const socialAccount = userSocialAccount.socialAccount;
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
      socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
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
    await recordSuccessfulLinkedInPost(post, socialAccount.id, data.id);
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
  socialAccountId: string,
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

export async function fetchLinkedInPostAnalytics(post: Post) {
  if (!post?.userId || !post?.url) {
    throw new Error("Missing userId or post URL");
  }

  // 1. Extract the 'share' URN from the URL
  const shareUrnMatch = post.url.match(/urn:li:share:\d+/);
  if (!shareUrnMatch) {
    throw new Error("Invalid LinkedIn post URL format. 'share' URN not found.");
  }
  const shareUrn = shareUrnMatch[0];

  // 2. Fetch the user's LinkedIn account and access token
  const userSocialAccount = await prisma.userSocialAccount.findFirst({
    where: {
      userId: post.userId,
      socialAccount: {
        platform: "LINKEDIN",
      },
    },
    include: {
      socialAccount: true,
    },
  });

  const socialAccount = userSocialAccount?.socialAccount;
  if (!socialAccount?.accessToken || !socialAccount?.platformUserId) {
    throw new Error("Missing LinkedIn access token or user ID");
  }

  // 3. Convert the 'share' URN to a 'ugcPost' URN
  const sharesUrl = `https://api.linkedin.com/v2/shares/${encodeURIComponent(shareUrn)}?projection=(owner,ugcPost)`;
  
  const sharesRes = await fetch(sharesUrl, {
    headers: {
      Authorization: `Bearer ${socialAccount.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
    },
  });

  if (!sharesRes.ok) {
    const err = await sharesRes.text();
    throw new Error(`LinkedIn Shares API failed: ${err}`);
  }

  const sharesData = await sharesRes.json();
  const ugcPostUrn = sharesData.ugcPost;

  if (!ugcPostUrn) {
    throw new Error("Could not find ugcPost URN for this share.");
  }

  // 4. Use the new ugcPost URN to fetch analytics
  const organizationalUrn = `urn:li:person:${socialAccount.platformUserId}`;
  const analyticsUrl = `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(organizationalUrn)}&shares=${encodeURIComponent(ugcPostUrn)}`;

  const analyticsRes = await fetch(analyticsUrl, {
    headers: {
      Authorization: `Bearer ${socialAccount.accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202402",
    },
  });

  if (!analyticsRes.ok) {
    const err = await analyticsRes.text();
    throw new Error(`LinkedIn Analytics API failed: ${err}`);
  }

  const analyticsData = await analyticsRes.json();
  const totalShareStatistics = analyticsData?.elements?.[0]?.totalShareStatistics;

  if (!totalShareStatistics) {
    throw new Error("No analytics data found for this post.");
  }

  return {
    likes: totalShareStatistics.likeCount,
    comments: totalShareStatistics.commentCount,
    shares: totalShareStatistics.shareCount,
    impressions: totalShareStatistics.impressionCount,
    clicks: totalShareStatistics.clickCount,
  };
}