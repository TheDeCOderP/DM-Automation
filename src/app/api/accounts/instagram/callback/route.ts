// app/api/social-accounts/instagram/callback/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  console.log('Instagram callback received:', {
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
  if (!process.env.INSTAGRAM_CLIENT_ID || !process.env.INSTAGRAM_CLIENT_SECRET) {
    return redirectWithError(request, 'Instagram integration not configured');
  }

  try {
    // Step 1: Exchange authorization code for access token
    console.log('Exchanging authorization code for access token...');
    
    const tokenParams = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Making token request with params:', {
      client_id: process.env.INSTAGRAM_CLIENT_ID.substring(0, 8) + '...',
      redirect_uri: redirectUri,
      code_length: code.length,
      grant_type: 'authorization_code'
    });

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams,
    });

    const responseText = await tokenRes.text();
    console.log('=== INSTAGRAM API RESPONSE ===');
    console.log('Status:', tokenRes.status, tokenRes.statusText);
    console.log('Response:', responseText);
    console.log('=== END RESPONSE ===');

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', responseText);
      throw new Error(`Instagram API returned invalid response: ${responseText}`);
    }

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData);
      const errorMessage = 
        tokenData.error_message || 
        tokenData.error?.message ||
        tokenData.error_description ||
        `Token exchange failed with status ${tokenRes.status}`;
      
      throw new Error(errorMessage);
    }

    // Handle different response formats
    let shortLivedAccessToken: string;
    let instagramUserId: string;
    let user: any = null;

    // Format 1: Business Login (data array format)
    if (tokenData.data && tokenData.data[0]) {
      console.log('Detected Business Login format');
      const responseData = tokenData.data[0];
      shortLivedAccessToken = responseData.access_token;
      instagramUserId = responseData.user_id;
      user = responseData.user;
    }
    // Format 2: Basic Display API (direct fields)
    else if (tokenData.access_token && tokenData.user_id) {
      console.log('Detected Basic Display API format');
      shortLivedAccessToken = tokenData.access_token;
      instagramUserId = tokenData.user_id;
      user = tokenData.user;
    }
    // Format 3: Alternative format
    else if (tokenData.access_token) {
      console.log('Detected alternative format');
      shortLivedAccessToken = tokenData.access_token;
      instagramUserId = tokenData.user_id;
      user = tokenData.user;
    }
    else {
      console.error('Unrecognized response format:', tokenData);
      throw new Error('Unrecognized response format from Instagram API');
    }

    if (!shortLivedAccessToken) {
      throw new Error('No access token received from Instagram');
    }

    console.log('Successfully obtained short-lived token:', {
      userId: instagramUserId,
      tokenLength: shortLivedAccessToken?.length,
      hasUser: !!user
    });

    // Step 2: Exchange for long-lived token
    console.log('Exchanging for long-lived token...');
    
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&` +
      `access_token=${shortLivedAccessToken}`;

    const longLivedTokenRes = await fetch(longLivedTokenUrl);
    const longLivedTokenText = await longLivedTokenRes.text();
    
    console.log('Long-lived token response:', {
      status: longLivedTokenRes.status,
      response: longLivedTokenText.substring(0, 500)
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
    const expiresIn = longLivedTokenData.expires_in || 5184000;
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    if (!longLivedAccessToken) {
      throw new Error('Missing long-lived access token');
    }

    console.log('Successfully obtained long-lived token');

    // Step 3: Get user profile information
    console.log('Fetching user profile...');
    
    const profileUrl = `https://graph.instagram.com/me?` +
      `fields=id,username,account_type,media_count&` +
      `access_token=${longLivedAccessToken}`;

    const profileRes = await fetch(profileUrl);
    const profileText = await profileRes.text();
    let profileData;

    try {
      profileData = JSON.parse(profileText);
    } catch (parseError) {
      console.error('Failed to parse profile response:', profileText);
      throw new Error(`Failed to get profile: ${profileText}`);
    }

    if (!profileRes.ok) {
      console.error('Failed to get profile:', profileData);
      throw new Error(
        profileData.error?.message || 
        `Failed to get profile with status ${profileRes.status}`
      );
    }

    console.log('Retrieved Instagram profile:', profileData);

    // Check if this is a Business account (if using Business API)
    if (profileData.account_type && profileData.account_type !== 'BUSINESS' && profileData.account_type !== 'CREATOR') {
      console.warn('Account is not a Business/Creator account:', profileData.account_type);
      // Don't throw error here, just warn - basic accounts can still be connected
    }

    // Save to database
    console.log('Saving to database...');
    try {
      const account = await prisma.socialAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: 'INSTAGRAM',
            platformUserId: profileData.id
          }
        },
        update: {
          accessToken: longLivedAccessToken,
          refreshToken: null,
          platformUserId: profileData.id,
          platformUsername: profileData.username,
          tokenExpiresAt: tokenExpiresAt,
        },
        create: {
          platform: 'INSTAGRAM',
          accessToken: longLivedAccessToken,
          refreshToken: null,
          platformUserId: profileData.id,
          platformUsername: profileData.username,
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

      console.log(`Successfully connected Instagram account: ${profileData.username}`);

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save account to database');
    }

    // Redirect to success page
    const successUrl = new URL('/accounts', request.nextUrl.origin);
    successUrl.searchParams.set('instagram', 'connected');
    successUrl.searchParams.set('username', profileData.username);
    return NextResponse.redirect(successUrl.toString());

  } catch (error) {
    console.error('Instagram callback error:', error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : 'Failed to connect Instagram account'
    );
  }
}

function redirectWithError(request: NextRequest, message: string) {
  const errorUrl = new URL('/accounts', request.nextUrl.origin);
  errorUrl.searchParams.set('error', 'instagram_connection_failed');
  errorUrl.searchParams.set('message', encodeURIComponent(message));
  return NextResponse.redirect(errorUrl.toString());
}