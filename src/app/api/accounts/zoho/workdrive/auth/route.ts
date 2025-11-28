// /api/accounts/zoho/workdrive/auth/route.ts
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/zoho/workdrive/callback`;
    
    const zohoScope = [
      'WorkDrive.team.READ', 
      'WorkDrive.users.READ',          // Read access to WorkDrive
      'WorkDrive.files.READ', 
      'WorkDrive.files.CREATE',          // All file operations
      'WorkDrive.teamfolders.READ',     // All team folder operations (includes team listing)
      'WorkDrive.teamfolders.CREATE',
      'WorkDrive.files.sharing.CREATE',
      'ZohoFiles.files.READ',
      'aaaserver.profile.READ'
    ].join(',');
    
    const authUrl = new URL('https://accounts.zoho.in/oauth/v2/auth');
    authUrl.searchParams.set('client_id', process.env.ZOHO_CLIENT_ID!);
    authUrl.searchParams.set('scope', zohoScope);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', 'register');
    authUrl.searchParams.set('prompt', 'consent');
    
    console.log('Auth URL:', authUrl.toString());
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error in Zoho WorkDrive authentication:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}