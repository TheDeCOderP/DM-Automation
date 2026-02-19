import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = token.id;
    const brandId = req.nextUrl.searchParams.get('brandId');
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/accounts';

    // Use the request's origin to build the redirect URI dynamically
    // Trust proxy headers for production environments (Vercel, etc.)
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.host;
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const origin = `${protocol}://${host}`;
    const redirectUri = `${origin}/api/accounts/linkedin/pages/callback`;

    const state = JSON.stringify({
      userId,
      brandId,
      returnUrl,
    });

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_PAGES_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=r_basicprofile,w_organization_social,rw_organization_admin,r_organization_social,r_member_postAnalytics,r_organization_social_feed,w_organization_social_feed&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error in LinkedIn authentication:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}
