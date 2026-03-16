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

  // Use the request's origin to build the redirect URI dynamically
  // Trust proxy headers for production environments (Vercel, etc.)
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
  const forwardedProto = req.headers.get('x-forwarded-proto');
  // Always use https in production; only trust x-forwarded-proto if it says https
  const protocol = forwardedProto === 'https' ? 'https' : (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/accounts/linkedin/callback`;

  const state = JSON.stringify({
    userId,
    brandId,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid,profile,email,w_member_social&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}