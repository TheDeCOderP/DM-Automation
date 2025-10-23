import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/pinterest/callback`;

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = token.id;
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

  // Pinterest requires specific scopes for different operations
  const scopes = [
    'boards:read',
    'boards:read_secret',
    'boards:write',
    'boards:write_secret',
    'pins:read',
    'pins:read_secret', 
    'pins:write',
    'pins:write_secret',
    'user_accounts:read'
  ].join(',');

  const authUrl = `https://www.pinterest.com/oauth/?response_type=code&client_id=${process.env.PINTEREST_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${encodeURIComponent(state)}`;
  
  return NextResponse.redirect(authUrl);
}