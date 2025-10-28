// app/api/social-accounts/facebook/auth/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const brandId = req.nextUrl.searchParams.get('brandId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/facebook/callback`;
  const state = JSON.stringify({
    userId,
    brandId,
  });

  const facebookScope = [
    'pages_show_list',
    'business_management',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(',');

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${facebookScope}&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}