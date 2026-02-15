import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/pinterest/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  if (!code || !state) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_code_or_state');
    return NextResponse.redirect(errorUrl.toString());
  }

  const { userId, brandId } = JSON.parse(state);

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.PINTEREST_CLIENT_ID}:${process.env.PINTEREST_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();
console.log('Pinterest token data:', tokenData);
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error}`);
    }

    // 2. Fetch Pinterest user account info
    const profileRes = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Pinterest profile');
    }
    
    const profile = await profileRes.json();

    // 3. Save to database and link to brand
    if (userId && brandId) {
      try {
        // Encrypt tokens before saving
        const encryptedAccessToken = await encryptToken(tokenData.access_token);
        const encryptedRefreshToken = await encryptToken(tokenData.refresh_token || '');

        // Upsert social account
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'PINTEREST',
              platformUserId: profile.username || profile.id
            }
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUsername: profile.username || '',
          },
          create: {
            platform: 'PINTEREST',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken || null,
            tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
            platformUserId: profile.username || profile.id,
            platformUsername: profile.username || '',
          }
        });

        // Ensure brand association exists
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

        // Ensure user association exists
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

    // Redirect to success page
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('pinterest', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('Pinterest callback error:', error);
    
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}