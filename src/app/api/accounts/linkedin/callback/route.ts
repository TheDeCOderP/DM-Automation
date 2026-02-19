// app/api/social-accounts/linkedin/callback/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const { userId, brandId } = JSON.parse(state!);

  // Build redirect URI dynamically from request origin
  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/accounts/linkedin/callback`;

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    // 2. Fetch LinkedIn profile
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { 
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Connection': 'Keep-Alive' 
      },
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }
    
    const profile = await profileRes.json();

    // 3. Save to database and link to brand
    if (userId && brandId) {
      try {
        // Encrypt tokens before saving
        const encryptedAccessToken = await encryptToken(tokenData.access_token);
        const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || '');

        // Upsert social account keyed by platform + platformUserId
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'LINKEDIN',
              platformUserId: profile.sub
            }
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUsername: profile.name || profile.given_name || '',
          },
          create: {
            platform: 'LINKEDIN',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUserId: profile.sub,
            platformUsername: profile.name || profile.given_name || '',
          }
        });

        // Ensure brand association exists via join table
        await prisma.socialAccountBrand.upsert({
          where: {
            brandId_socialAccountId: {
              brandId,
              socialAccountId: account.id
            }
          },
          update: {
            connectedByUserId: userId
          },
          create: {
            brandId,
            socialAccountId: account.id,
            connectedByUserId: userId
          }
        });

        // Ensure user association exists via join table
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
    dashboardUrl.searchParams.set('linkedin', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    
    // Use absolute URL for error redirect
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}