// app/api/social-accounts/instagram/callback/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const { userId, brandId } = JSON.parse(state!);
  const error = searchParams.get('error');

  if (error) {
    return redirectWithError(request, `Instagram error: ${error}`);
  }

  if (!code) {
    return redirectWithError(request, 'Authorization code missing');
  }

  try {
    // 1. Exchange code for short-lived access token (Instagram endpoint)
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_APP_ID!, // Use Instagram App ID
        client_secret: process.env.INSTAGRAM_APP_SECRET!, // Use Instagram App Secret
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenRes.json();
    
    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenData);
      throw new Error(`Token exchange failed: ${tokenData.error_message || tokenData.error?.message || 'Unknown error'}`);
    }

    const shortLivedAccessToken = tokenData.access_token;
    const userId = tokenData.user_id; // Instagram User ID from the token response

    // 2. Exchange short-lived token for long-lived token (60 days)
    const longLivedTokenRes = await fetch(
      `https://graph.instagram.com/access_token?` +
      `grant_type=ig_exchange_token&` +
      `client_secret=${process.env.INSTAGRAM_APP_SECRET}&` +
      `access_token=${shortLivedAccessToken}`
    );
    
    const longLivedTokenData = await longLivedTokenRes.json();
    
    if (!longLivedTokenRes.ok) {
      console.error('Long-lived token exchange failed:', longLivedTokenData);
      throw new Error(`Long-lived token failed: ${longLivedTokenData.error?.message || 'Unknown error'}`);
    }

    const longLivedAccessToken = longLivedTokenData.access_token;
    const expiresIn = longLivedTokenData.expires_in || 5184000; // 60 days in seconds
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Get Instagram Business Account details using the long-lived token
    const accountRes = await fetch(
      `https://graph.instagram.com/v19.0/${userId}?` +
      `fields=id,username,account_type,name,profile_picture_url,media_count,media{id,caption,media_type,media_url,permalink,timestamp}&` +
      `access_token=${longLivedAccessToken}`
    );

    const instagramAccount = await accountRes.json();
    
    if (!accountRes.ok) {
      console.error('Failed to get Instagram account details:', instagramAccount);
      throw new Error(`Failed to get Instagram details: ${instagramAccount.error?.message || 'Unknown error'}`);
    }

    // 4. Verify this is a Business or Creator account (required for publishing)
    if (instagramAccount.account_type !== 'BUSINESS' && instagramAccount.account_type !== 'CREATOR') {
      throw new Error(
        'Instagram account must be a Business or Creator account to enable publishing. ' +
        'Please convert your account in Instagram settings.'
      );
    }

    // 5. Get connected Facebook Page information (required for some operations)
    let connectedPage = null;
    try {
      const pagesRes = await fetch(
        `https://graph.instagram.com/v19.0/${userId}/accounts?` +
        `access_token=${longLivedAccessToken}`
      );
      
      const pagesData = await pagesRes.json();
      if (pagesRes.ok && pagesData.data && pagesData.data.length > 0) {
        connectedPage = pagesData.data[0];
      }
    } catch (pageError) {
      console.warn('Could not fetch connected pages:', pageError);
      // This is not critical for basic operations
    }

    // 6. Save to database
    if (userId) {
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
            platformUserId: instagramAccount.id,
            platformUsername: instagramAccount.username,
            tokenExpiresAt: tokenExpiresAt,
          },
          create: {
            platform: 'INSTAGRAM',
            accessToken: longLivedAccessToken,
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
    }

    // 7. Redirect to success page
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