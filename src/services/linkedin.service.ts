import { prisma } from "@/lib/prisma";
import { Post, Media } from "@prisma/client";
import { isTokenExpired } from "@/utils/token";
import { decryptToken } from "@/lib/encryption";

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
        OR: [
          // Case 1: User personally connected the brand’s LinkedIn account
          {
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
          // Case 2: Another user connected the LinkedIn account, but it's linked to the same brand
          {
            socialAccount: {
              platform: 'LINKEDIN',
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

export async function publishToLinkedInPage(
  post: Post & { media?: Media[] }
): Promise<{ id: string }> {
  try {
    if (!post.socialAccountPageId) throw new Error('Invalid input');

    // 1. Get LinkedIn Page token
    const socialAccountPage = await prisma.socialAccountPage.findFirst({
      where: {
        id: post.socialAccountPageId,
        platform: 'LINKEDIN',
        isActive: true,
      },
      include: {
        socialAccount: {
          include: {
            brands: {
              where: {
                brandId: post.brandId
              }
            }
          }
        }
      }
    });

    if (!socialAccountPage) {
      await handleLinkedInPostFailure(post, 'No active LinkedIn Page found for this brand');
      throw new Error('No active LinkedIn Page found for this brand');
    }

    // Decrypt the access token
    const accessToken = await decryptToken(socialAccountPage.accessToken);
    
    if (isTokenExpired(socialAccountPage.tokenExpiresAt)) {
      await handleLinkedInPostFailure(post, 'LinkedIn Page token is expired');
      throw new Error('LinkedIn Page token is expired');
    }

    // For LinkedIn Pages, author URN format is different
    const authorUrn = `urn:li:organization:${socialAccountPage.pageId}`;
    
    return await publishLinkedInContent(post, accessToken, authorUrn, 'page', socialAccountPage.id);
  } catch (error) {
    console.error("Error in publishing to LinkedIn Page:", error);
    throw error;
  }
}

// Unified function to handle both personal and page posts
async function publishLinkedInContent(
  post: Post & { media?: Media[] },
  accessToken: string,
  authorUrn: string,
  postType: 'personal' | 'page',
  socialAccountPageId?: string
): Promise<{ id: string }> {
  let assetUrn: string | null = null;

  // 1. Get media for the post if not already included
  const media = post.media || await prisma.media.findMany({
    where: { postId: post.id }
  });

  // 2. Handle media upload if provided
  if (media.length > 0) {
    try {
      const firstMedia = media[0];
      assetUrn = await uploadMediaToLinkedin(firstMedia, accessToken, authorUrn);
    } catch (error) {
      console.error('Media upload failed:', error);
      // Proceed with text-only post if media fails
    }
  }

  // 3. Create post body
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

  // 4. Post to LinkedIn
  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202410' // Updated to latest version
    },
    body: JSON.stringify(postBody)
  });

  const data = await response.json();

  if (!response.ok) {
    await handleLinkedInPostFailure(post, data);
    throw new Error(`LinkedIn API error: ${JSON.stringify(data)}`);
  }

  // 5. Record successful post
  if (postType === 'page' && socialAccountPageId) {
    await recordSuccessfulLinkedInPost(post, socialAccountPageId, data.id);
  } else {
    //await recordSuccessfulLinkedInPost(post, data.id);
  }
  
  return data;
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

// Remove the unused import from your file
// Remove: import { refreshAccessToken } from './some-file';

// Define proper interfaces for the LinkedIn API responses
interface LinkedInSocialActionsResponse {
  likesSummary?: {
    totalLikes: number;
    aggregatedTotalLikes: number;
  };
  commentsSummary?: {
    totalFirstLevelComments: number;
    aggregatedTotalComments: number;
  };
  $URN: string;
}

interface LinkedInShareStatisticsElement {
  totalShareStatistics?: {
    impressionCount: number;
    clickCount: number;
    engagement: number;
  };
}

interface LinkedInShareStatisticsResponse {
  elements: LinkedInShareStatisticsElement[];
}

interface LinkedInUGCPostResponse {
  lifecycleState: string;
  visibility: string;
  created?: {
    time: number;
  };
  firstPublishedAt: number;
  author: string;
}

interface LinkedInAnalyticsData {
  shareUrn: string;
  organizationUrn: string;
  fetchedAt: string;
  likes?: number;
  aggregatedLikes?: number;
  comments?: number;
  aggregatedComments?: number;
  activityUrn?: string;
  rawSocialData?: LinkedInSocialActionsResponse;
  shareStatistics?: LinkedInShareStatisticsResponse;
  impressions?: number;
  clicks?: number;
  engagement?: number;
  postDetails?: {
    lifecycleState: string;
    visibility: string;
    createdTime?: number;
    firstPublishedAt?: number;
    author: string;
  };
  summary: {
    likes: number;
    comments: number;
    impressions: number | string;
    clicks: number | string;
    engagement: number | string;
  };
}

export async function fetchLinkedInPostAnalytics(post: Post): Promise<LinkedInAnalyticsData> {
  if (!post?.userId || !post?.url || !post?.socialAccountPageId) {
    throw new Error("Missing userId or post URL or Page ID");
  }

  const shareUrnMatch = post.url.match(/urn:li:share:\d+/);
  if (!shareUrnMatch) {
    throw new Error("Invalid LinkedIn post URL format. 'share' URN not found.");
  }
  const shareUrn = shareUrnMatch[0];

  const page = await prisma.socialAccountPage.findUnique({
    where: {
      id: post.socialAccountPageId
    },
    include: {
      socialAccount: true
    }
  });

  if (!page) {
    throw new Error("Invalid Page ID");
  }

  const accessToken = await decryptToken(page.accessToken);

  if (isTokenExpired(page.tokenExpiresAt)) {
    throw new Error("LinkedIn Page Token Expired");
  }

  const organizationUrn = `urn:li:organization:${page.pageId}`;
  
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-Restli-Protocol-Version': '2.0.0'
  };

  try {
    // Get social actions (likes and comments)
    const socialActionsResponse = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(shareUrn)}`,
      {
        method: 'GET',
        headers: headers
      }
    );

    let analyticsData: LinkedInAnalyticsData = {
      shareUrn,
      organizationUrn,
      fetchedAt: new Date().toISOString(),
      summary: {
        likes: 0,
        comments: 0,
        impressions: 'Not available',
        clicks: 'Not available',
        engagement: 'Not available'
      }
    };

    if (socialActionsResponse.ok) {
      const socialData: LinkedInSocialActionsResponse = await socialActionsResponse.json();
      const likes = socialData.likesSummary?.totalLikes || 0;
      const comments = socialData.commentsSummary?.totalFirstLevelComments || 0;
      
      analyticsData = {
        ...analyticsData,
        likes,
        aggregatedLikes: socialData.likesSummary?.aggregatedTotalLikes || 0,
        comments,
        aggregatedComments: socialData.commentsSummary?.aggregatedTotalComments || 0,
        activityUrn: socialData.$URN,
        rawSocialData: socialData,
        summary: {
          ...analyticsData.summary,
          likes,
          comments
        }
      };
    }

    // Try to get additional metrics from other endpoints
    try {
      // Try organizational entity share statistics for impressions
      const statsResponse = await fetch(
        `https://api.linkedin.com/v2/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=${encodeURIComponent(organizationUrn)}&shares=${encodeURIComponent(shareUrn)}`,
        {
          method: 'GET',
          headers: headers
        }
      );

      if (statsResponse.ok) {
        const statsData: LinkedInShareStatisticsResponse = await statsResponse.json();
        analyticsData.shareStatistics = statsData;
        
        // Extract impressions if available
        if (statsData.elements && statsData.elements.length > 0) {
          const element = statsData.elements[0];
          const impressions = element.totalShareStatistics?.impressionCount || 0;
          const clicks = element.totalShareStatistics?.clickCount || 0;
          const engagement = element.totalShareStatistics?.engagement || 0;

          analyticsData.impressions = impressions;
          analyticsData.clicks = clicks;
          analyticsData.engagement = engagement;
          
          analyticsData.summary = {
            ...analyticsData.summary,
            impressions,
            clicks,
            engagement
          };
        }
      }
    } catch (error) {
      console.log('Share statistics endpoint not available:', error);
    }

    // Get basic post info for context
    try {
      const postResponse = await fetch(
        `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(shareUrn)}`,
        {
          method: 'GET',
          headers: headers
        }
      );

      if (postResponse.ok) {
        const postData: LinkedInUGCPostResponse = await postResponse.json();
        analyticsData.postDetails = {
          lifecycleState: postData.lifecycleState,
          visibility: postData.visibility,
          createdTime: postData.created?.time,
          firstPublishedAt: postData.firstPublishedAt,
          author: postData.author
        };
      }
    } catch (error) {
      console.log('UGC Posts endpoint not available:', error);
    }

    console.log(analyticsData);
    return analyticsData;

  } catch (error) {
    console.error('Error fetching LinkedIn analytics:', error);
    throw new Error(`Failed to fetch LinkedIn post analytics: ${error}`);
  }
}