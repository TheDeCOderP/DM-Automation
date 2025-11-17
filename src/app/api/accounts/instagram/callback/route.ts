// app/api/social-accounts/instagram/callback/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('Instagram Business Login callback received:', {
    hasCode: !!code,
    hasState: !!state,
    error,
    codeLength: code?.length
  });

  if (error) {
    return redirectWithError(request, `Instagram authorization denied: ${error}`);
  }

  if (!code) {
    return redirectWithError(request, 'Authorization code missing');
  }

  if (!state) {
    return redirectWithError(request, 'State parameter missing');
  }

  let userId: string;
  let brandId: string;

  try {
    const stateData = JSON.parse(state);
    userId = stateData.userId;
    brandId = stateData.brandId;
    console.log('Parsed state:', { userId, brandId });
  } catch (stateError) {
    return redirectWithError(request, 'Invalid state parameter');
  }

  // Validate environment variables
  if (!process.env.INSTAGRAM_APP_ID) {
    return redirectWithError(request, 'Instagram App ID not configured');
  }

  if (!process.env.INSTAGRAM_APP_SECRET) {
    return redirectWithError(request, 'Instagram App Secret not configured');
  }

  try {
    // Step 2: Exchange the Code For a Token (Instagram Business Login)
    console.log('Exchanging authorization code for access token...');
    
    const tokenParams = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID,
      client_secret: process.env.INSTAGRAM_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Making token request to Instagram Business Login endpoint...');
    
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    const responseText = await tokenRes.text();
    console.log('Token exchange response:', {
      status: tokenRes.status,
      statusText: tokenRes.statusText,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500)
    });

    // Handle response according to Business Login format
    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse token response as JSON:', responseText);
      
      // Provide specific error messages
      if (responseText.includes('Matching code was not found')) {
        throw new Error('Authorization code is invalid or has expired. Please try connecting again.');
      } else if (responseText.includes('redirect_uri')) {
        throw new Error('Redirect URI mismatch. Please check your Instagram app configuration.');
      } else {
        throw new Error(`Instagram API returned: ${responseText}`);
      }
    }

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData);
      
      const errorMessage = 
        tokenData.error_message || 
        tokenData.error?.message ||
        `Token exchange failed with status ${tokenRes.status}`;
      
      throw new Error(errorMessage);
    }

    // Business Login returns data in a "data" array
    if (!tokenData.data || !tokenData.data[0]) {
      throw new Error('Invalid response format from Instagram Business Login');
    }

    const responseData = tokenData.data[0];
    const shortLivedAccessToken = responseData.access_token;
    const instagramUserId = responseData.user_id;
    const permissions = responseData.permissions;

    if (!shortLivedAccessToken) {
      throw new Error('No access token received from Instagram');
    }

    if (!instagramUserId) {
      throw new Error('No user ID received from Instagram');
    }

    console.log('Successfully obtained short-lived token via Business Login:', {
      userId: instagramUserId,
      permissions: permissions,
      tokenLength: shortLivedAccessToken.length
    });

    // Step 3: Get a long-lived access token (60 days)
    console.log('Exchanging for long-lived token...');
    
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
      `access_token=${shortLivedAccessToken}`;

    console.log('Long-lived token URL:', longLivedTokenUrl.replace(process.env.INSTAGRAM_APP_SECRET!, '***'));
    
    const longLivedTokenRes = await fetch(longLivedTokenUrl);
    const longLivedTokenText = await longLivedTokenRes.text();
    
    console.log('Long-lived token response:', {
      status: longLivedTokenRes.status,
      responsePreview: longLivedTokenText.substring(0, 200)
    });

    let longLivedTokenData;
    try {
      longLivedTokenData = JSON.parse(longLivedTokenText);
    } catch (parseError) {
      console.error('Failed to parse long-lived token response:', longLivedTokenText);
      throw new Error(`Long-lived token exchange failed: ${longLivedTokenText}`);
    }

    if (!longLivedTokenRes.ok) {
      console.error('Long-lived token exchange failed:', longLivedTokenData);
      throw new Error(
        longLivedTokenData.error?.message || 
        `Long-lived token failed with status ${longLivedTokenRes.status}`
      );
    }

    const longLivedAccessToken = longLivedTokenData.access_token;
    const expiresIn = longLivedTokenData.expires_in || 5184000; // 60 days in seconds
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    if (!longLivedAccessToken) {
      throw new Error('Missing long-lived access token in response');
    }

    console.log('Successfully obtained long-lived token');

    // Get Instagram Business Account details
    console.log('Fetching Instagram Business account details...');
    
    // For Business accounts, we need to get the linked Facebook Page and Instagram Business Account
    const accountUrl = `https://graph.instagram.com/v19.0/${instagramUserId}?` +
      `fields=id,username,account_type,name,profile_picture_url,media_count&` +
      `access_token=${longLivedAccessToken}`;

    const accountRes = await fetch(accountUrl);
    const accountText = await accountRes.text();
    let instagramAccount;

    try {
      instagramAccount = JSON.parse(accountText);
    } catch (parseError) {
      console.error('Failed to parse account response:', accountText);
      throw new Error(`Failed to get account details: ${accountText}`);
    }

    if (!accountRes.ok) {
      console.error('Failed to get Instagram account details:', instagramAccount);
      throw new Error(
        instagramAccount.error?.message || 
        `Failed to get account details with status ${accountRes.status}`
      );
    }

    console.log('Retrieved Instagram account:', {
      id: instagramAccount.id,
      username: instagramAccount.username,
      account_type: instagramAccount.account_type,
      name: instagramAccount.name
    });

    // Verify this is a Business account
    if (instagramAccount.account_type !== 'BUSINESS') {
      throw new Error(
        'This integration requires an Instagram Business account. ' +
        'Please convert your account to a Business account in Instagram settings and try again.'
      );
    }

    // Get connected Facebook Page information (required for Business accounts)
    let connectedPage = null;
    try {
      const pagesUrl = `https://graph.instagram.com/v19.0/${instagramUserId}/accounts?` +
        `access_token=${longLivedAccessToken}`;
      
      const pagesRes = await fetch(pagesUrl);
      if (pagesRes.ok) {
        const pagesData = await pagesRes.json();
        if (pagesData.data && pagesData.data.length > 0) {
          connectedPage = pagesData.data[0];
          console.log('Found connected Facebook Page:', connectedPage.id);
        }
      }
    } catch (pageError) {
      console.warn('Could not fetch connected Facebook pages:', pageError);
      // This might not be critical for all operations
    }

    // Save to database
    console.log('Saving Instagram Business account to database...');
    try {
      const account = await prisma.socialAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: 'INSTAGRAM',
            platformUserId: instagramAccount.id
          }
        },
        update: {
          accessToken: longLivedAccessToken,
          refreshToken: null,
          platformUserId: instagramAccount.id,
          platformUsername: instagramAccount.username,
          tokenExpiresAt: tokenExpiresAt,
        },
        create: {
          platform: 'INSTAGRAM',
          accessToken: longLivedAccessToken,
          refreshToken: null,
          platformUserId: instagramAccount.id,
          platformUsername: instagramAccount.username,
          tokenExpiresAt: tokenExpiresAt,
        }
      });

      await prisma.socialAccountBrand.upsert({
        where: {
          brandId_socialAccountId: {
            brandId,
            socialAccountId: account.id
          }
        },
        update: {},
        create: {
          brandId,
          socialAccountId: account.id
        }
      });

      console.log(`Successfully connected Instagram Business account: ${instagramAccount.username}`);

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save account to database');
    }

    // Redirect to success page
    const successUrl = new URL('/accounts', request.nextUrl.origin);
    successUrl.searchParams.set('instagram', 'connected');
    successUrl.searchParams.set('username', instagramAccount.username);
    successUrl.searchParams.set('account_type', 'business');
    return NextResponse.redirect(successUrl.toString());

  } catch (error) {
    console.error('Instagram Business Login callback error:', error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : 'Failed to connect Instagram Business account'
    );
  }
}

// Helper function for error redirects
function redirectWithError(request: NextRequest, message: string) {
  const errorUrl = new URL('/accounts', request.nextUrl.origin);
  errorUrl.searchParams.set('error', 'instagram_connection_failed');
  errorUrl.searchParams.set('message', encodeURIComponent(message));
  return NextResponse.redirect(errorUrl.toString());
}