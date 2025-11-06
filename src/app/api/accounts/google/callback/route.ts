// app/api/social-accounts/google/callback/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { encryptToken } from "@/lib/encryption";
import { NextRequest, NextResponse } from "next/server";

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/google/callback`;

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

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

    const brand = await prisma.userBrand.findFirst({
      where: { userId: token?.id }
    });

    // 3. Save to DB
    if (token?.id) {
      try {
        // Encrypt tokens before saving
        const encryptedAccessToken = await encryptToken(tokenData.access_token);
        const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || '');
        
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'GOOGLE',
              platformUserId: profile.sub,
            },
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000)
              : null,
            platformUsername: profile.email,
          },
          create: {
            platform: 'GOOGLE',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: tokenData.expires_in
              ? new Date(Date.now() + tokenData.expires_in * 1000)
              : null,
            platformUserId: profile.sub,
            platformUsername: profile.email,
          },
        });

        // Link Google account with the brand
        await prisma.socialAccountBrand.upsert({
          where: {
            brandId_socialAccountId: {
              brandId: brand?.id!,
              socialAccountId: account.id,
            },
          },
          update: {},
          create: {
            brandId: brand?.id!,
            socialAccountId: account.id,
          },
        });

        await prisma.userSocialAccount.upsert({
          where: {
            userId_socialAccountId: {
              userId: token.id,
              socialAccountId: account.id
            },
          },
          update: {},
          create: {
            userId: token.id,
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
