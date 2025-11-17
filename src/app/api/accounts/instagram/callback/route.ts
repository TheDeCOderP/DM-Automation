// app/api/social-accounts/instagram/callback/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return redirectWithError(request, `Instagram error: ${error}`);
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
  } catch (stateError) {
    return redirectWithError(request, 'Invalid state parameter');
  }

  try {
    // 1. Exchange code for short-lived access token
    const tokenParams = new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code: code,
    });

    console.log('Exchanging code for token...');
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams,
    });

    // Handle non-JSON responses
    const responseText = await tokenRes.text();
    let tokenData;
    
    try {
      tokenData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse token response as JSON:', responseText);
      throw new Error(`Instagram API returned invalid JSON: ${responseText}`);
    }

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', {
        status: tokenRes.status,
        statusText: tokenRes.statusText,
        data: tokenData
      });
      
      throw new Error(
        tokenData.error_message || 
        tokenData.error?.message || 
        `Token exchange failed with status ${tokenRes.status}`
      );
    }

    const shortLivedAccessToken = tokenData.access_token;
    const instagramUserId = tokenData.user_id;

    if (!shortLivedAccessToken || !instagramUserId) {
      throw new Error('Missing access token or user ID in response');
    }

    // 2. Exchange short-lived token for long-lived token (60 days)
    console.log('Exchanging for long-lived token...');
    const longLivedTokenUrl = `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
      `access_token=${shortLivedAccessToken}`;

    const longLivedTokenRes = await fetch(longLivedTokenUrl);
    const longLivedTokenText = await longLivedTokenRes.text();
    let longLivedTokenData;

    try {
      longLivedTokenData = JSON.parse(longLivedTokenText);
    } catch (parseError) {
      console.error('Failed to parse long-lived token response:', longLivedTokenText);
      throw new Error(`Long-lived token exchange returned invalid JSON: ${longLivedTokenText}`);
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

    // 3. Get Instagram account details
    console.log('Fetching account details...');
    const accountUrl = `https://graph.instagram.com/v19.0/${instagramUserId}?` +
      `fields=id,username,account_type,name,profile_picture&` +
      `access_token=${longLivedAccessToken}`;

    const accountRes = await fetch(accountUrl);
    const accountText = await accountRes.text();
    let instagramAccount;

    try {
      instagramAccount = JSON.parse(accountText);
    } catch (parseError) {
      console.error('Failed to parse account response:', accountText);
      throw new Error(`Account details returned invalid JSON: ${accountText}`);
    }

    if (!accountRes.ok) {
      console.error('Failed to get Instagram account details:', instagramAccount);
      throw new Error(
        instagramAccount.error?.message || 
        `Failed to get account details with status ${accountRes.status}`
      );
    }

    // 4. Verify this is a Business or Creator account
    if (instagramAccount.account_type !== 'BUSINESS' && instagramAccount.account_type !== 'CREATOR') {
      throw new Error(
        'Instagram account must be a Business or Creator account to enable publishing. ' +
        'Please convert your account in Instagram settings and try again.'
      );
    }

    // 5. Save to database
    console.log('Saving to database...');
    try {
      // First, create or update the social account
      const account = await prisma.socialAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: 'INSTAGRAM',
            platformUserId: instagramAccount.id
          }
        },
        update: {
          accessToken: longLivedAccessToken,
          refreshToken: null, // Instagram uses long-lived tokens
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

      // Then link to brand
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

      console.log(`Successfully connected Instagram account: ${instagramAccount.username}`);

    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error('Failed to save account to database');
    }

    // 6. Redirect to success page
    const successUrl = new URL('/accounts', request.nextUrl.origin);
    successUrl.searchParams.set('instagram', 'connected');
    successUrl.searchParams.set('username', instagramAccount.username);
    return NextResponse.redirect(successUrl.toString());

  } catch (error) {
    console.error('Instagram callback error:', error);
    return redirectWithError(
      request,
      error instanceof Error ? error.message : 'Failed to connect Instagram account'
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