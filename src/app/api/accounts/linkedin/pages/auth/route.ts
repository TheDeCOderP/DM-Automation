import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/linkedin/pages/callback`;

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = token.id;
    const brandId = req.nextUrl.searchParams.get('brandId');

    const state = JSON.stringify({
      userId,
      brandId,
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
