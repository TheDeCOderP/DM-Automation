// app/api/social-accounts/google/auth/route.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/google/callback`;

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append(
    'scope',
    'openid email profile https://www.googleapis.com/auth/drive.readonly'
  );
  authUrl.searchParams.append('access_type', 'offline'); // for refresh token
  authUrl.searchParams.append('prompt', 'consent'); // force refresh token each time

  return NextResponse.redirect(authUrl.toString());
}
