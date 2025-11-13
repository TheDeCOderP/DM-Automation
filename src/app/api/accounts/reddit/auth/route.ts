// app/api/social-accounts/reddit/auth/route.ts
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

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/reddit/callback`;
  const state = JSON.stringify({
    userId,
    brandId,
  });

  const redditScope = [
    'mysubreddits',
    'identity',
    'submit',
    'read',
    'history'
  ].join(',');

  const authUrl = `https://www.reddit.com/api/v1/authorize?client_id=${process.env.REDDIT_CLIENT_ID}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}&duration=permanent&scope=${redditScope}`;
  
  return NextResponse.redirect(authUrl);
}