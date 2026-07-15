// app/api/accounts/google/business/auth/route.ts
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const brandId = req.nextUrl.searchParams.get('brandId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/google/business/callback`;
  const state = JSON.stringify({ userId, brandId });

  const googleScopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/business.manage' // Core GBP Scope
  ].join(' ');

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID!);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', googleScopes);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('access_type', 'offline'); // Required for refresh token
  authUrl.searchParams.append('prompt', 'consent'); // Forces refresh token generation
  
  return NextResponse.redirect(authUrl.toString());
}