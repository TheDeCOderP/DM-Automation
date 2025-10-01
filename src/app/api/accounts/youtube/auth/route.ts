// app/api/accounts/youtube/auth/route.ts
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const brandId = req.nextUrl.searchParams.get('brandId');
  
  if (!userId || !brandId) {
    return NextResponse.json(
      { error: 'User ID and Brand ID are required' },
      { status: 400 }
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/youtube/callback`;

  // Keep track of who is connecting
  const state = encodeURIComponent(
    JSON.stringify({ userId, brandId })
  );

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append(
    'scope',
    'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/userinfo.profile'
  );
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline'); // for refresh token
  authUrl.searchParams.append('prompt', 'consent'); // force refresh token each time

  return NextResponse.redirect(authUrl.toString());
}
