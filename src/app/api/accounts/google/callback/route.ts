// app/api/social-accounts/google/callback/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/google/callback`;

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
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(
        `Token exchange failed: ${tokenData.error_description || tokenData.error}`
      );
    }

    // 2. Fetch Google profile (OIDC userinfo endpoint)
    const profileRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      throw new Error('Failed to fetch Google profile');
    }

    const profile = await profileRes.json();

    // 3. Save to DB
    if (userId && brandId) {
      try {
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'GOOGLE',
              platformUserId: profile.sub,
            }
          },
          update: {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUsername: profile.email,
            isConnected: true,
            userId: userId,
          },
          create: {
            platform: 'GOOGLE',
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || null,
            tokenExpiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : null,
            platformUserId: profile.sub,
            platformUsername: profile.email,
            isConnected: true,
            userId: userId,
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

    // 4. Redirect to dashboard
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('google', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('Google callback error:', error);

    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}
