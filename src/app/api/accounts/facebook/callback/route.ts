import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/facebook/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const { userId, brandId } = JSON.parse(state!);

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    /** 1️⃣ Exchange code for short-lived User Access Token */
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

    /** 2️⃣ Exchange short-lived token for long-lived token */
    const longLivedTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longLivedTokenData = await longLivedTokenRes.json();

    const userAccessToken = longLivedTokenData.access_token || tokenData.access_token;

    /** Expiration handling */
    let expiresIn = 60 * 60 * 24 * 60; // default 60 days
    if (longLivedTokenData.expires_in) {
      expiresIn = parseInt(longLivedTokenData.expires_in.toString());
    } else if (tokenData.expires_in) {
      expiresIn = parseInt(tokenData.expires_in.toString());
    }
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    /** 3️⃣ Get user profile + pages */
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,accounts{id,name,access_token}&access_token=${userAccessToken}`
    );
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Facebook profile');
    }
    const profile = await profileRes.json();

    /** 5️⃣ Store tokens in DB */
    if (userId) {
      try {
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'FACEBOOK',
              platformUserId: profile.id
            }
          },
          update: {
            accessToken: userAccessToken, // store USER token
            platformUserId: profile.id,
            platformUsername: profile.name, // store USER name
            isConnected: true,
            tokenExpiresAt,
            userId: userId,
          },
          create: {
            platform: 'FACEBOOK',
            accessToken: userAccessToken,
            platformUserId: profile.id,
            platformUsername: profile.name, // store USER name
            userId: userId,
            isConnected: true,
            tokenExpiresAt
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
      } catch (error) {
        console.error('Database error:', error);
      }
    }

    /** 6️⃣ Redirect back to dashboard */
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('facebook', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());

  } catch (error) {
    console.error('Facebook callback error:', error);
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}
