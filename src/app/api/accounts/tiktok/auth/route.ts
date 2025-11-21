import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';
import crypto from 'crypto';

// The callback URI must be registered in the TikTok Developer Portal exactly as it appears here.
const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/tiktok/callback`;

// Helper function to generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  return { codeVerifier, codeChallenge };
}

export async function GET(req: NextRequest) {
  // 1. Authenticate the user session
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

  // 2. Generate PKCE code verifier and challenge
  const { codeVerifier, codeChallenge } = generatePKCE();

  // 3. Prepare the 'state' parameter for security and context preservation
  // This JSON string will be returned in the callback and used for CSRF protection and identifying the user/brand.
  const state = JSON.stringify({
    userId,
    brandId,
    codeVerifier, // Store the code verifier to use in the callback
  });

  // 4. Define the required TikTok scopes
  const scopes = [
    // Read user's basic profile (ID, display name, avatar)
    'user.info.basic',
    // Read additional profile data (bio, profile link)
    'user.info.profile',
    // Read key account statistics (followers, likes, video count)
    'user.info.stats',
    // MANDATORY: Allows for direct, automated publishing/scheduling of content
    'video.publish' 
  ].join(',');

  // 5. Construct the final TikTok authorization URL (v2 endpoint)
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${process.env.TIKTOK_CLIENT_ID}` +
    `&response_type=code` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${codeChallenge}` +
    `&code_challenge_method=S256`;
  
  // 6. Redirect the user to TikTok
  return NextResponse.redirect(authUrl);
}