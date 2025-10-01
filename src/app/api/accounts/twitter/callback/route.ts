// app/api/social-accounts/twitter/callback/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/twitter/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const { userId, brandId } = JSON.parse(decodeURIComponent(state!));

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: 'challenge',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    // 2. Fetch Twitter profile
    const profileRes = await fetch('https://api.twitter.com/2/users/me', {
      headers: { 
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Twitter profile');
    }
    
    const profile = await profileRes.json();

    // 3. Save to database if you have a user ID in state
    if (userId && brandId) {
      try {
        // Encrypt tokens before saving
        const encryptedAccessToken = await encryptToken(tokenData.access_token);
        const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || '');

        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'TWITTER',
              platformUserId: profile.data.id
            }
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUserId: profile.data.id,
            platformUsername: profile.data.username,
          }, 
          create: {
            platform: 'TWITTER',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUserId: profile.data.id,
            platformUsername: profile.data.username,
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
      } catch (error) {
        console.error('Database error:', error);
        // Continue to redirect even if DB save fails
      }
    }

    // Use absolute URL for redirect
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('twitter', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('Twitter callback error:', error);
    
    // Use absolute URL for error redirect
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}