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
    return redirectWithError(request, `Facebook error: ${error}`);
  }

  if (!code) {
    return redirectWithError(request, 'Authorization code missing');
  }

  try {
    // 1. Exchange code for short-lived token
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error?.message || 'Unknown error'}`);
    }

    // 2. Exchange for long-lived token (60 days)
    const longLivedTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${process.env.FACEBOOK_CLIENT_ID}&` +
      `client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&` +
      `fb_exchange_token=${tokenData.access_token}`
    );
    
    const longLivedTokenData = await longLivedTokenRes.json();
    const accessToken = longLivedTokenData.access_token || tokenData.access_token;
    const expiresIn = parseInt(
      (longLivedTokenData.expires_in || tokenData.expires_in || (60 * 60 * 24 * 60)).toString()
    );
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Get user's pages to find connected Instagram account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?` +
      `fields=id,name,access_token,instagram_business_account{id,username}&` +
      `access_token=${accessToken}`
    );

    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) {
      throw new Error(`Failed to fetch pages: ${pagesData.error?.message}`);
    }

    // Find first page with Instagram connection
    const connectedPage = pagesData.data.find(
      (page: { instagram_business_account: { id: string } }) => page.instagram_business_account
    );

    if (!connectedPage) {
      throw new Error(
        'No Instagram Business account connected to a Facebook Page. ' +
        'Please connect your Instagram account to a Facebook Page in Settings.'
      );
    }

    // 4. Get full Instagram account details
    const instagramRes = await fetch(
      `https://graph.facebook.com/v19.0/${connectedPage.instagram_business_account.id}?` +
      `fields=id,username,name,profile_picture_url,followers_count&` +
      `access_token=${accessToken}`
    );

    const instagramAccount = await instagramRes.json();
    if (!instagramRes.ok) {
      throw new Error(`Failed to get Instagram details: ${instagramAccount.error?.message}`);
    }

    // 5. Save to database
    if (userId) {
      await prisma.socialAccount.upsert({
        where: {
          userId_platform_brandId: {
            userId: userId,
            platform: 'INSTAGRAM',
            brandId: brandId
          }
        },
        update: {
          accessToken: accessToken, // Using the long-lived token
          platformUserId: instagramAccount.id,
          platformUsername: instagramAccount.username,
          isConnected: true,
          tokenExpiresAt: tokenExpiresAt,
        },
        create: {
          platform: 'INSTAGRAM',
          accessToken: accessToken,
          platformUserId: instagramAccount.id,
          platformUsername: instagramAccount.username,
          userId: userId,
          isConnected: true,
          tokenExpiresAt: tokenExpiresAt,
          brandId: brandId
        }
      });
    }

    // Redirect to success page
    const successUrl = new URL('/accounts', request.nextUrl.origin);
    successUrl.searchParams.set('instagram', 'connected');
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
  const errorUrl = new URL('/auth/error', request.nextUrl.origin);
  errorUrl.searchParams.set('message', encodeURIComponent(message));
  return NextResponse.redirect(errorUrl.toString());
}