// app/api/social-accounts/facebook/auth/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }

  const redirectUri = `${req.headers.get('origin')}/api/accounts/facebook/callback`;

  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement,pages_show_list,public_profile&state=${userId}`;
  
  return NextResponse.redirect(authUrl);
}