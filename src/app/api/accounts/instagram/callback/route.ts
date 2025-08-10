// app/api/social-accounts/instagram/callback/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse, NextRequest } from 'next/server';

import { FacebookPage } from '@/types/facebook';

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
        client_id: process.env.INSTAGRAM_CLIENT_ID!,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET!,
        redirect_uri: process.env.INSTAGRAM_REDIRECT_URI!,
        code,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error?.message || 'Unknown error'}`);
    }

    // 2. Get long-lived token
    const longLivedTokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.INSTAGRAM_CLIENT_ID}&client_secret=${process.env.INSTAGRAM_CLIENT_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    
    const longLivedTokenData = await longLivedTokenRes.json();
    const accessToken = longLivedTokenData.access_token || tokenData.access_token;
    
    // Handle expiration
    let expiresIn = 60 * 60 * 24 * 60; // Default 60 days if not provided
    if (longLivedTokenData.expires_in) {
      expiresIn = parseInt(longLivedTokenData.expires_in.toString());
    } else if (tokenData.expires_in) {
      expiresIn = parseInt(tokenData.expires_in.toString());
    }

    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // 3. Fetch Instagram account info
    // First get the Facebook page connected to the Instagram account
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,access_token&access_token=${accessToken}`
    );
    
    if (!pagesRes.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }
    
    const pagesData = await pagesRes.json();
    const pageWithInstagram = pagesData.data.find((page: FacebookPage) => page.instagram_business_account);

    if (!pageWithInstagram) {
      throw new Error('No Instagram account connected to your Facebook pages');
    }

    // Get Instagram business account details
    const instagramRes = await fetch(
      `https://graph.facebook.com/v19.0/${pageWithInstagram.instagram_business_account.id}?fields=id,username,name,profile_picture_url&access_token=${accessToken}`
    );
    
    if (!instagramRes.ok) {
      throw new Error('Failed to fetch Instagram account');
    }
    
    const instagramAccount = await instagramRes.json();

    // 4. Save to database if you have a user ID in state
    if (state) {
      try {
        await prisma.socialAccount.upsert({
          where: {
            userId_platform: {
              userId: state,
              platform: 'INSTAGRAM'
            }
          },
          update: {
            accessToken: pageWithInstagram.access_token,
            platformUserId: instagramAccount.id,
            platformUsername: instagramAccount.username,
            isConnected: true,
            tokenExpiresAt: tokenExpiresAt,
          },
          create: {
            platform: 'INSTAGRAM',
            accessToken: pageWithInstagram.access_token,
            platformUserId: instagramAccount.id,
            platformUsername: instagramAccount.username,
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

    const dashboardUrl = new URL('/accounts', request.nextUrl.origin);
    dashboardUrl.searchParams.set('instagram', 'connected');
    return NextResponse.redirect(dashboardUrl.toString());
  } catch (error) {
    console.error('Instagram callback error:', error);
    
    const errorUrl = new URL('/auth/error', request.nextUrl.origin);
    errorUrl.searchParams.set(
      'message', 
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(errorUrl.toString());
  }
}