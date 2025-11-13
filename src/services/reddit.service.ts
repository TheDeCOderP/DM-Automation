// lib/social/reddit.ts
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/encryption";
import { isTokenExpired } from "@/utils/token";
import { Post, Media } from "@prisma/client";

interface RedditPostResponse {
  success: boolean;
  data?: {
    json: {
      data: {
        id: string;
        url: string;
        name: string;
      };
      errors: Array<[string, string, string]>;
    };
  };
  postUrl?: string;
  error?: string;
}

interface RedditPostData {
  title: string;
  content: string;
  subreddit: string;
  kind: 'self' | 'link' | 'image';
  flair?: string;
  nsfw?: boolean;
  spoiler?: boolean;
  sendReplies?: boolean;
}

export async function publishToReddit(
  post: Post & { media?: Media[] }
): Promise<RedditPostResponse> {
  try {
    if (!post) throw new Error('Invalid input');

    // 1. Get Reddit account through user relation
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        OR: [
          // Case 1: User personally connected the brand's Reddit account
          {
            userId: post.userId,
            socialAccount: {
              platform: 'REDDIT',
              brands: {
                some: {
                  brandId: post.brandId
                }
              }
            }
          },
          // Case 2: Another user connected the Reddit account, but it's linked to the same brand
          {
            socialAccount: {
              platform: 'REDDIT',
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
          message: "Failed to publish your post on Reddit - no connected account",
          metadata: {
            postId: post.id,
            platform: "REDDIT"
          }
        }
      });

      throw new Error('User has no connected Reddit account for this brand');
    }

    const socialAccount = userSocialAccount.socialAccount;
    
    // Decrypt tokens
    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if (socialAccount.refreshToken) {
      socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    // Check if token is expired
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
      // Attempt to refresh token
      const newToken = await refreshRedditToken(socialAccount.refreshToken);
      if (newToken) {
        // Update the token in database
        await updateRedditToken(socialAccount.id, newToken);
        socialAccount.accessToken = newToken.access_token;
        socialAccount.tokenExpiresAt = new Date(Date.now() + (newToken.expires_in * 1000));
      } else {
        throw new Error('Reddit token is expired and could not be refreshed');
      }
    }

    // 2. Get media for the post if not already included
    const media = post.media || await prisma.media.findMany({
      where: { postId: post.id }
    });

    // 3. Determine the target subreddit
    const targetSubreddit = await getTargetSubreddit(post, socialAccount.id);
    if (!targetSubreddit) {
      throw new Error('No valid subreddit specified for posting');
    }

    // 4. Prepare post data based on content and media
    const postData = await prepareRedditPostData(post, media, targetSubreddit);

    // 5. Submit post to Reddit
    const responseData = await submitRedditPost(postData, socialAccount.accessToken);

    // 6. Record successful post
    if (responseData.success && responseData.data?.json.data.id) {
      await recordSuccessfulRedditPost(post, socialAccount.id, responseData);
    } else {
      const errorMessage = responseData.data?.json.errors?.[0]?.[1] || 
                          responseData.error || 
                          'Reddit API returned an error';
      throw new Error(errorMessage);
    }

    return responseData;
  } catch (error) {
    console.error("Error in publishing to Reddit:", error);
    
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
        title: "Reddit Post Failed",
        message: `Failed to publish your post on Reddit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        metadata: {
          postId: post.id,
          platform: "REDDIT"
        }
      }
    });

    throw error;
  }
}

async function getTargetSubreddit(post: Post, socialAccountId: string): Promise<string> {  
  // 2. Check if there's a default subreddit for this social account
  const socialAccountPage = await prisma.socialAccountPage.findFirst({
    where: {
      socialAccountId: socialAccountId,
      platform: 'REDDIT',
      isActive: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (socialAccountPage?.name) {
    console.log('Using default subreddit from page:', socialAccountPage.name);
    return socialAccountPage.name; // This should be the display_name like 'javascript'
  }

  // 3. Fallback: Get the first available subreddit for this account
  const firstSubreddit = await prisma.socialAccountPage.findFirst({
    where: {
      socialAccountId: socialAccountId,
      platform: 'REDDIT',
      isActive: true
    },
    orderBy: {
      createdAt: 'asc'
    }
  });

  if (firstSubreddit?.name) {
    console.log('Using first available subreddit:', firstSubreddit.name);
    return firstSubreddit.name;
  }

  // 4. Final fallback to brand name
  const brand = await prisma.brand.findUnique({
    where: { id: post.brandId }
  });

  if (brand?.name) {
    const cleanName = brand.name.replace(/[^a-zA-Z0-9]/g, '');
    console.log('Using brand name as subreddit:', cleanName);
    return cleanName;
  }

  throw new Error('No target subreddit specified and no fallback available');
}
async function prepareRedditPostData(
  post: Post, 
  media: Media[], 
  subreddit: string
): Promise<RedditPostData> {
  // Determine post type based on media and content
  let kind: 'self' | 'link' | 'image' = 'self';
  let content = post.content || '';

  if (media.length > 0) {
    const firstMedia = media[0];
    
    if (firstMedia.type === 'IMAGE') {
      // For images, use link post to the image URL
      // Note: Native image upload requires multipart/form-data and is more complex
      kind = 'link';
      content = firstMedia.url;
    } else if (firstMedia.type === 'VIDEO') {
      // Reddit doesn't support direct video upload via API
      kind = 'link';
      content = firstMedia.url;
    }
    
  } else if (content.includes('http://') || content.includes('https://')) {
    // If content contains URLs, make it a link post
    const urlMatch = content.match(/https?:\/\/[^\s]+/);
    if (urlMatch) {
      kind = 'link';
      content = urlMatch[0];
    }
  }
  
  // Ensure title is not empty and within limits
  let title = post.content?.substring(0, 300) || 'New Post';
  if (title.length === 0) {
    title = 'New Post'; // Fallback title
  }

  return {
    title: title,
    content: content,
    subreddit: subreddit,
    kind: kind,
    nsfw: false,
    spoiler: false,
    sendReplies: true // Default to true
  };
}

async function submitRedditPost(
  postData: RedditPostData,
  accessToken: string
): Promise<RedditPostResponse> {
  // Prepare base parameters according to Reddit API
  const params: Record<string, string> = {
    api_type: 'json',
    sr: postData.subreddit,
    kind: postData.kind,
    title: postData.title,
    resubmit: 'true' // Important for link posts
  };

  // Add content based on post type
  if (postData.kind === 'self') {
    params.text = postData.content;
  } else if (postData.kind === 'link') {
    params.url = postData.content;
  } else if (postData.kind === 'image') {
    // For image posts, you need to use the special image upload endpoint
    // This is more complex and requires separate handling
    params.url = postData.content; // Fallback to link post for now
  }

  // Add optional parameters
  if (postData.flair) {
    params.flair_id = postData.flair;
  }
  if (postData.nsfw) {
    params.nsfw = 'true';
  }
  if (postData.spoiler) {
    params.spoiler = 'true';
  }
  if (postData.sendReplies !== undefined) {
    params.sendreplies = postData.sendReplies.toString();
  }

  const formData = new URLSearchParams(params);

  try {
    console.log('Submitting to Reddit with params:', {
      sr: postData.subreddit,
      kind: postData.kind,
      title: postData.title.substring(0, 50) + '...',
      hasContent: !!postData.content
    });

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0 by YourAppName'
      },
      body: formData
    });

    const responseText = await response.text();
    console.log('Reddit API Response status:', response.status);
    console.log('Raw response:', responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Reddit response as JSON');
      return {
        success: false,
        error: `Reddit returned invalid JSON: ${responseText.substring(0, 200)}`
      };
    }

    // Check for Reddit API success
    if (result.json && result.json.errors && result.json.errors.length > 0) {
      const errorMessage = result.json.errors[0][1] || result.json.errors[0][0] || 'Reddit API error';
      console.error('Reddit API errors:', result.json.errors);
      return {
        success: false,
        error: errorMessage
      };
    }

    // Check for successful post creation
    if (result.json && result.json.data && result.json.data.id) {
      const postUrl = `https://reddit.com${result.json.data.permalink}`;
      console.log('Post created successfully:', postUrl);
      return {
        success: true,
        data: result,
        postUrl: postUrl
      };
    }

    // If we get here, something unexpected happened
    console.error('Unexpected Reddit response structure:', result);
    return {
      success: false,
      error: 'Unexpected response format from Reddit'
    };

  } catch (error) {
    console.error('Network error submitting to Reddit:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error occurred'
    };
  }
}

async function refreshRedditToken(refreshToken?: string | null): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
} | null> {
  if (!refreshToken) {
    return null;
  }

  try {
    const authString = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString('base64');

    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      console.error('Failed to refresh Reddit token');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error refreshing Reddit token:', error);
    return null;
  }
}

async function updateRedditToken(
  socialAccountId: string, 
  tokenData: { access_token: string; refresh_token?: string; expires_in: number }
) {
  const encryptedAccessToken = await encryptToken(tokenData.access_token);
  const encryptedRefreshToken = tokenData.refresh_token ? 
    await encryptToken(tokenData.refresh_token) : undefined;

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000))
    }
  });
}

async function recordSuccessfulRedditPost(
  post: Post,
  socialAccountId: string,
  response: RedditPostResponse
) {
  const postId = response.data?.json.data.id;
  const postUrl = response.postUrl;

  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: postUrl,
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Post Published",
        message: "Your post has been successfully published on Reddit",
        metadata: {
          postId: post.id,
          platform: "REDDIT",
          postUrl: postUrl,
          redditPostId: postId
        }
      }
    })
  ]);
}

// Utility functions for Reddit API
export async function getRedditSubreddits(
  socialAccountId: string,
  type: 'subscribed' | 'moderated' = 'subscribed'
) {
  try {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId }
    });

    if (!socialAccount || socialAccount.platform !== 'REDDIT') {
      throw new Error('Invalid Reddit social account');
    }

    const accessToken = await decryptToken(socialAccount.accessToken);

    let endpoint = 'https://oauth.reddit.com/subreddits/mine/subscriber?limit=100';
    if (type === 'moderated') {
      endpoint = 'https://oauth.reddit.com/subreddits/mine/moderator?limit=100';
    }

    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch subreddits');
    }

    const data = await response.json();
    return data.data.children.map((sub: any) => ({
      id: sub.data.display_name,
      name: sub.data.display_name,
      title: sub.data.title,
      subscribers: sub.data.subscribers,
      description: sub.data.public_description,
      type: type,
      userIsModerator: type === 'moderated'
    }));
  } catch (error) {
    console.error('Error fetching Reddit subreddits:', error);
    throw error;
  }
}

export async function validateRedditSubreddit(
  socialAccountId: string,
  subreddit: string
) {
  try {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId }
    });

    if (!socialAccount || socialAccount.platform !== 'REDDIT') {
      throw new Error('Invalid Reddit social account');
    }

    const accessToken = await decryptToken(socialAccount.accessToken);

    const response = await fetch(
      `https://oauth.reddit.com/r/${subreddit}/about`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
        }
      }
    );

    if (!response.ok) {
      return { isValid: false, error: 'Subreddit not found or inaccessible' };
    }

    const data = await response.json();
    
    return {
      isValid: true,
      data: {
        name: data.data.display_name,
        title: data.data.title,
        subscribers: data.data.subscribers,
        over18: data.data.over18,
        restriction: data.data.subreddit_type,
        userIsModerator: data.data.user_is_moderator,
        userIsSubscriber: data.data.user_is_subscriber
      }
    };
  } catch (error) {
    console.error('Error validating Reddit subreddit:', error);
    return { isValid: false, error: 'Failed to validate subreddit' };
  }
}