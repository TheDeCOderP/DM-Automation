// app/api/social-accounts/facebook/callback/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set('message', 'missing_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.FACEBOOK_CLIENT_ID!,
        client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI!,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error?.message || 'Unknown error'}`);
    }

    // 2. Get long-lived token
    const longLivedTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_CLIENT_ID}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    
    const longLivedTokenData = await longLivedTokenRes.json();
    const accessToken = longLivedTokenData.access_token || tokenData.access_token;
    
    // Handle expiration - Facebook sometimes returns expires_in as a string
    let expiresIn = 60 * 60 * 24 * 60; // Default 60 days if not provided
    if (longLivedTokenData.expires_in) {
      expiresIn = parseInt(longLivedTokenData.expires_in.toString());
    } else if (tokenData.expires_in) {
      expiresIn = parseInt(tokenData.expires_in.toString());
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);
    console.log('Token expiration:', tokenExpiresAt);

    // 3. Fetch Facebook profile and pages
    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name,accounts{id,name,access_token}&access_token=${accessToken}`
    );
    
    if (!profileRes.ok) {
      throw new Error('Failed to fetch Facebook profile');
    }
    
    const profile = await profileRes.json();

    // 4. Save to database if you have a user ID in state
    if (state) {
      try {
        const firstPage = profile.accounts?.data?.[0];
        
        if (!firstPage) {
          throw new Error('No Facebook pages found for this account');
        }

        // Validate the expiration date
        if (isNaN(tokenExpiresAt.getTime())) {
          throw new Error('Invalid token expiration date calculated');
        }

        await prisma.socialAccount.upsert({
          where: {
            userId_platform: {
              userId: state,
              platform: 'FACEBOOK'
            }
          },
          update: {
            accessToken: firstPage.access_token,
            platformUserId: profile.id,
            platformUsername: profile.name,
            isConnected: true,
            tokenExpiresAt: tokenExpiresAt,
          },
          create: {
            platform: 'FACEBOOK',
            accessToken: firstPage.access_token,
            platformUserId: profile.id,
            platformUsername: profile.name,
            userId: state,
            isConnected: true,
            tokenExpiresAt: tokenExpiresAt,
          }
        });
      } catch (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }
    }

    const dashboardUrl = new URL('/dashboard', request.nextUrl.origin);
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