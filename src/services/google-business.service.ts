import { prisma } from "@/lib/prisma";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";
import { decryptToken } from "@/lib/encryption";
import { Post, Media, SocialAccount } from "@prisma/client";
import { updateCalendarItemStatus } from "@/utils/calendar-status-updater";

export async function publishToGoogleBusiness(
  post: Post & { media?: Media[]; socialAccount?: SocialAccount | null; gbpLocationId?: string | null }
) {
  if (!post) {
    throw new Error("Invalid input for publishToGoogleBusiness");
  }

  // 1. Resolve Social Account
  let socialAccount = post.socialAccount;
  if (!socialAccount) {
    socialAccount = await prisma.socialAccount.findUnique({
      where: { id: post.socialAccountId! }
    });
  }

  if (!socialAccount) {
    throw new Error("User has no connected Google Business account for this post");
  }

  // 2. Decrypt & Refresh Tokens
  socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
  if (socialAccount.refreshToken) {
    socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
  }

  let { accessToken } = socialAccount;
  if (isTokenExpired(socialAccount.tokenExpiresAt)) {
    accessToken = await refreshAccessToken(socialAccount);
  }

  // 3. Resolve the exact GBP Location (CRITICAL FIX: using gbpLocationId)
  const targetLocationId = post.gbpLocationId || post.socialAccountPageId;
  
  const location = await prisma.gbpLocation.findFirst({
    where: targetLocationId 
      ? { id: targetLocationId } 
      : { socialAccountId: socialAccount.id }
  });

  if (!location) {
    throw new Error("No verified Google Business Profile location found for this account.");
  }

  // 4. Fetch the Account ID prefix required for the legacy v4 API
  const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!accountsRes.ok) {
    throw new Error("Failed to fetch Google Account ID context");
  }
  
  const accountsData = await accountsRes.json();
  const gbpAccounts = accountsData.accounts || [];

  // 5. Construct the Payload
  const media = post.media || (await prisma.media.findMany({ where: { postId: post.id } }));
  
  const postPayload: any = {
    languageCode: "en-US",
    summary: post.content,
    topicType: "STANDARD",
    // Note: 'state' is removed here because Google treats it as an Output-Only field
  };

  // Attach Media if it exists (Google takes the raw URL directly)
  if (media.length > 0) {
    postPayload.media = media.map(m => ({
      mediaFormat: m.type === "VIDEO" ? "VIDEO" : "PHOTO",
      sourceUrl: m.url
    }));
  }

  // If a URL is provided, add a "LEARN MORE" Call to Action button
  if (post.url) {
    postPayload.callToAction = {
      actionType: "LEARN_MORE",
      url: post.url
    };
  }

  let fetchSuccess = false;
  let responseData: any = null;
  let lastApiError = "";

  // 6. Execute against the v4 API by finding the correct account/location pairing
  for (const account of gbpAccounts) {
    const requestUrl = `https://mybusiness.googleapis.com/v4/${account.name}/${location.locationName}/localPosts`;
    
    const postRes = await fetch(requestUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postPayload),
    });

    if (postRes.ok) {
      responseData = await postRes.json();
      console.log("\n[GBP API RESPONSE]:", JSON.stringify(responseData, null, 2), "\n");
      fetchSuccess = true;
      break; 
    } else {
      // Capture the exact error from Google for debugging
      lastApiError = await postRes.text();
      console.error(`[GBP Post Failed for ${account.name}]:`, lastApiError);
    }
  }

  if (!fetchSuccess) {
    await handleGBPPostFailure(post, `Google API Error: ${lastApiError}`);
    throw new Error(`Failed to publish to Google Business Profile: ${lastApiError}`);
  }

  // 7. Record Success
  await recordSuccessfulPost(post, responseData.searchUrl);
  return responseData;
}

async function recordSuccessfulPost(post: Post, searchUrl?: string) {
  await prisma.$transaction([
    prisma.post.update({
      where: { id: post.id },
      data: { 
        status: 'PUBLISHED',
        url: searchUrl || `https://business.google.com/`, 
        publishedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.notification.create({
      data: {
        userId: post.userId,
        type: "POST_PUBLISHED",
        title: "Google Post Published",
        message: `Your update is now live on Google Search and Maps.`,
        metadata: {
          postId: post.id,
          platform: "GOOGLE_BUSINESS_PROFILE",
        }
      }
    })
  ]);

  await updateCalendarItemStatus(post.id);
}

async function handleGBPPostFailure(post: Post, errorMessage: string) {
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
        title: "Google Post Failed",
        message: `Failed to publish to Google Business Profile`,
        metadata: {
          postId: post.id,
          platform: "GOOGLE_BUSINESS_PROFILE",
          error: errorMessage
        }
      }
    })
  ]);
}