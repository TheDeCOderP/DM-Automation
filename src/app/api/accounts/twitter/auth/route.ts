// app/api/social-accounts/twitter/auth/route.ts
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

  const redirectUri = `${req.headers.get('origin')}/api/accounts/twitter/callback`;

  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', encodeURIComponent(redirectUri));
  authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access media.write');
  authUrl.searchParams.append('state', userId);
  authUrl.searchParams.append('code_challenge', 'challenge');
  authUrl.searchParams.append('code_challenge_method', 'plain');
  
  return NextResponse.redirect(authUrl.toString());
}