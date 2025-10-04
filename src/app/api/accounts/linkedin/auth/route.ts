import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/linkedin/callback`;

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  const brandId = req.nextUrl.searchParams.get('brandId');
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  const state = JSON.stringify({
    userId,
    brandId,
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid,profile,email,w_member_social&state=${state}`;
  
  return NextResponse.redirect(authUrl);
}