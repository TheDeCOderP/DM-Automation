import { prisma } from "@/lib/prisma";
import { GeneratedContent, SocialAccount } from "@prisma/client";

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
    for_super_followers_only?: boolean;
    nullcast?: boolean;
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

export async function publishToTwitter(
  generatedContent: GeneratedContent,
  imageBase64: string | null,
  userId: string
): Promise<TwitterTweetResponse['data']> {
  if (!generatedContent?.content || !userId) {
    throw new Error('Invalid input for publishToTwitter');
  }

  // 1. Get Twitter account
  const socialAccount = await prisma.socialAccount.findUnique({
    where: {
      userId_platform: {
        userId,
        platform: 'TWITTER'
      },
      isConnected: true
    }
  });

  if (!socialAccount || !socialAccount.isConnected) {
    throw new Error('No active Twitter account found for this user');
  }

  // 2. Handle token refresh if needed
  let { accessToken } = socialAccount;
  if (isTokenExpired(socialAccount.tokenExpiresAt)) {
    accessToken = await refreshTwitterToken(socialAccount);
  }

  // 3. Prepare tweet body
  const tweetBody: TweetBody = {
    text: generatedContent.content.slice(0, 250),
    nullcast: false,
  };

  // 4. Handle image upload if provided
  if (imageBase64) {
    try {
      const mediaId = await uploadBase64ImageToTwitter(imageBase64, accessToken);
      tweetBody.media = { media_ids: [mediaId] };
    } catch (error) {
      console.error('Image upload failed, posting as text-only:', error);
    }
  }

  // 5. Post the tweet
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
    await handleTwitterPostFailure(generatedContent.id, data);
    throw new Error(`Twitter API error: ${data.errors?.[0]?.detail || 'Unknown error'}`);
  }

  // 6. Record successful post
  await recordSuccessfulPost(generatedContent.id, socialAccount.id, data.data.id);
  return data.data;
}

async function uploadBase64ImageToTwitter(
  imageBase64: string,
  accessToken: string
): Promise<string> {
  // 1. Validate base64 string
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  if (base64Data.length > 7 * 1024 * 1024) { // ~5MB when encoded
    throw new Error('Image exceeds Twitter size limits');
  }

  // 2. Upload directly to Twitter
  const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      media_data: base64Data,
      media_category: 'tweet_image'
    })
  });

  const uploadData: TwitterMediaUploadResponse = await uploadResponse.json();

  if (!uploadResponse.ok || !uploadData.media_id_string) {
    throw new Error(`Failed to upload image to Twitter: ${JSON.stringify(uploadData)}`);
  }

  return uploadData.media_id_string;
}

async function recordSuccessfulPost(
  contentId: string,
  accountId: string,
  tweetId: string
) {
  await prisma.$transaction([
    prisma.platformPost.create({
      data: {
        platform: 'TWITTER',
        platformPostId: tweetId,
        postUrl: `https://twitter.com/i/status/${tweetId}`,
        postedAt: new Date(),
        status: 'PUBLISHED',
        generatedContentId: contentId,
        socialAccountId: accountId
      }
    }),
    prisma.generatedContent.update({
      where: { id: contentId },
      data: { 
        status: 'PUBLISHED',
        publishedAt: new Date() 
      }
    })
  ]);
}

async function handleTwitterPostFailure(
  contentId: string,
  errorData: TwitterTweetResponse
) {
  await prisma.generatedContent.update({
    where: { id: contentId },
    data: { status: 'FAILED' }
  });
  console.error('Twitter post failed:', errorData);
}

function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) < new Date(Date.now() + 60000); // 1 minute buffer
}