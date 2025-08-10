// app/api/social-accounts/instagram/auth/route.ts
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

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/instagram/callback`;
  // Instagram uses the same OAuth system as Facebook
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_content_publish,pages_show_list&state=${userId}`;
  
  return NextResponse.redirect(authUrl);
}