// app/api/social-accounts/instagram/auth/route.ts
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

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;
  const state = JSON.stringify({
    userId,
    brandId,
  });
  // Instagram uses the same OAuth system as Facebook
  const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}