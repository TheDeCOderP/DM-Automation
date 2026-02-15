import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptToken } from '@/lib/encryption';

// The redirect URI must exactly match the one used in the initiation route.
const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/tiktok/callback`;

/**
 * Handles the redirect from TikTok after user authorization.
 * Exchanges the 'code' for an access token and saves the user's TikTok account details.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Parse state to retrieve userId and brandId passed during initiation
  if (!state) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_state_parameter');
    return NextResponse.redirect(errorUrl.toString());
  }
  const { userId, brandId } = JSON.parse(state);

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_authorization_code_or_user_denied');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // 1. Exchange code for access and refresh tokens
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_key: process.env.TIKTOK_CLIENT_ID!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      }),
    });

    const tokenData = await tokenRes.json();
    console.log("token data", tokenData);

    // Check if token exchange failed - look for error properties in response
    if (!tokenRes.ok || tokenData.error) {
      throw new Error(`Token exchange failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`);
    }

    // Validate that we have the required tokens
    if (!tokenData.access_token || !tokenData.open_id) {
      throw new Error('Invalid token response: missing access_token or open_id');
    }

    const { open_id, access_token, refresh_token, expires_in, refresh_expires_in } = tokenData;

    // 2. Fetch TikTok user profile (display name, avatar) using the new access token
    const profileRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
      headers: { 
        'Authorization': `Bearer ${access_token}`,
        'Connection': 'Keep-Alive' 
      },
    });
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch TikTok user profile');
    }
    
    const profileData = await profileRes.json();
    
    // Check if profile data is valid
    if (!profileData.data || !profileData.data.user) {
      throw new Error('Invalid profile response from TikTok');
    }
    
    const profile = profileData.data.user;

    // 3. Save to database and link to brand
    if (userId && brandId && open_id) {
      try {
        // Encrypt tokens before saving
        const encryptedAccessToken = await encryptToken(access_token);
        const encryptedRefreshToken = refresh_token ? await encryptToken(refresh_token) : null;

        // Calculate token expiration times
        const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);
        const refreshExpiresAt = refresh_expires_in ? new Date(Date.now() + refresh_expires_in * 1000) : null;

        // Upsert social account keyed by platform + platformUserId (open_id)
        const account = await prisma.socialAccount.upsert({
          where: {
            platform_platformUserId: {
              platform: 'TIKTOK',
              platformUserId: open_id
            }
          },
          update: {
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: tokenExpiresAt,
            platformUsername: profile.display_name || 'TikTok User',
          },
          create: {
            platform: 'TIKTOK',
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            tokenExpiresAt: tokenExpiresAt,
            platformUserId: open_id,
            platformUsername: profile.display_name || 'TikTok User',
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
        console.error('Database error during TikTok save:', error);
        // Continue to redirect even if DB save fails, but log the error
      }
    }

    // Use absolute URL for redirect
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('tiktok', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('TikTok callback error:', error);
    
    // Use absolute URL for error redirect
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown TikTok connection error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}