// app/api/social-accounts/youtube/callback/route.ts
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error);
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', `OAuth error: ${error}`);
    return NextResponse.redirect(errorUrl.toString());
  }

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'Authorization code missing');
    return NextResponse.redirect(errorUrl.toString());
  }

  if (!state) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'State parameter missing');
    return NextResponse.redirect(errorUrl.toString());
  }

  let userId: string, brandId: string;
  try {
    const stateData = JSON.parse(decodeURIComponent(state));
    userId = stateData.userId;
    brandId = stateData.brandId;
  } catch (error) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'Invalid state parameter');
    return NextResponse.redirect(errorUrl.toString());
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/youtube/callback`;

  try {
    console.log('Exchanging code for tokens...');
    console.log('Redirect URI:', redirectUri);
    console.log('Client ID exists:', !!process.env.GOOGLE_CLIENT_ID);
    console.log('Client Secret exists:', !!process.env.GOOGLE_CLIENT_SECRET);

    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code: code,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log('Token exchange response:', { 
      status: tokenRes.status,
      ok: tokenRes.ok,
      data: tokenData 
    });

    if (!tokenRes.ok) {
      throw new Error(
        `Token exchange failed: ${tokenData.error} - ${tokenData.error_description}`
      );
    }

    // 2. Fetch YouTube channel info
    console.log('Fetching YouTube channel info...');
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: { 
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      }
    );
    
    const channelData = await channelRes.json();
    console.log('Channel response:', channelData);

    if (!channelRes.ok) {
      throw new Error(`Failed to fetch YouTube channel: ${channelData.error?.message}`);
    }

    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('No YouTube channel found for this account');
    }

    const channel = channelData.items[0];

    // Encrypt tokens before saving
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || '');


    // 3. Save to database
    console.log('Saving to database...');
    const account = await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: 'YOUTUBE',
          platformUserId: channel.id
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || null,
        tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        platformUserId: channel.id,
        platformUsername: channel.snippet.title,
      }, 
      create: {
        platform: 'YOUTUBE',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || null,
        tokenExpiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        platformUserId: channel.id,
        platformUsername: channel.snippet.title,
      }
    });

    // Link with brand
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

    // Link with user
    await prisma.userSocialAccount.upsert({
      where: {
        userId_socialAccountId: {
          userId,
          socialAccountId: account.id
        },
      },
      update: {},
      create: {
        userId,
        socialAccountId: account.id
      }
    });

    console.log('YouTube account connected successfully');

    // 4. Redirect to dashboard
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('youtube', 'connected');
    dashboardUrl.searchParams.set('channel', channel.snippet.title);
    return NextResponse.redirect(dashboardUrl.toString());

  } catch (error) {
    console.error('YouTube callback error:', error);
    
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown error during YouTube connection'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}