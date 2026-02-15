// /api/accounts/zoho/workdrive/callback/route.ts
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
import { encryptToken } from '@/lib/encryption'
import { NextRequest, NextResponse } from 'next/server'

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/zoho/workdrive/callback`
const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.in'
const ZOHO_WORKDRIVE_USER_URL = 'https://www.zohoapis.in/workdrive/api/v1/users/me'

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors from Zoho
  if (error) {
    console.error('Zoho OAuth error:', error);
    const errorDescription = searchParams.get('error_description');
    const errorUrl = new URL('/accounts', req.nextUrl.origin)
    errorUrl.searchParams.set('error', `Zoho authentication failed: ${errorDescription || error}`)
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code) {
    const errorUrl = new URL('/accounts', req.nextUrl.origin)
    errorUrl.searchParams.set('error', 'missing_code')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    console.log('Exchanging code for token...');
    
    const tokenRes = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        code: code,
        grant_type: 'authorization_code',
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('Token response:', tokenData);

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`)
    }

    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      throw new Error('No access token received from Zoho')
    }

    const expiresInSeconds = parseInt(expires_in?.toString() || '3600')
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    console.log('Fetching user profile...');
    
    // Try to get user info from WorkDrive API first
    let zohoUserId = null;
    let zohoUsername = 'Zoho WorkDrive User';
    
    try {
      const profileRes = await fetch(ZOHO_WORKDRIVE_USER_URL, {
        headers: {
          Authorization: `Zoho-oauthtoken ${access_token}`,
          Accept: 'application/vnd.api+json',
        },
      })
      
      if (profileRes.ok) {
        const userData = await profileRes.json()
        console.log('WorkDrive user data:', userData);
        
        const userInfo = userData.data || userData;
        zohoUserId = userInfo.id || userInfo.attributes?.zuid || userInfo.zuid;
        zohoUsername = userInfo.attributes?.display_name || 
                      userInfo.attributes?.name || 
                      userInfo.display_name || 
                      userInfo.name || 
                      'Zoho WorkDrive User';
      } else {
        console.warn('WorkDrive API failed, trying accounts API...');
        throw new Error('WorkDrive API failed');
      }
    } catch (workdriveError) {
      console.warn('WorkDrive API error, trying accounts API:', workdriveError);
      
      // Fallback to accounts API
      try {
        const accountsRes = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/user/info`, {
          headers: {
            Authorization: `Zoho-oauthtoken ${access_token}`,
          },
        })
        
        if (accountsRes.ok) {
          const userInfo = await accountsRes.json()
          console.log('Accounts user info:', userInfo);
          
          zohoUserId = userInfo.ZUID || userInfo.id;
          zohoUsername = userInfo.Display_Name || userInfo.Full_Name || userInfo.Email || 'Zoho User';
        }
      } catch (accountsError) {
        console.warn('Accounts API also failed:', accountsError);
      }
    }

    // If we still don't have a user ID, generate one
    if (!zohoUserId) {
      zohoUserId = `zoho_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Generated fallback user ID:', zohoUserId);
    }
console.log("Access Token:", access_token, "Refresh Token:", refresh_token);
    // Encrypt tokens before saving
    const encryptedAccessToken = await encryptToken(access_token);
    const encryptedRefreshToken = await encryptToken(refresh_token);

    // Create or update social account
    const account = await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: 'ZOHO_WORKDRIVE',
          platformUserId: zohoUserId,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || null,
        tokenExpiresAt,
        platformUsername: zohoUsername,
      },
      create: {
        platform: 'ZOHO_WORKDRIVE',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken || null,
        tokenExpiresAt,
        platformUserId: zohoUserId,
        platformUsername: zohoUsername,
      },
    })

    console.log('Social account created/updated:', account.id);

    // Find user's brand
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
      },
    })

    if (!userBrand) {
      throw new Error('No brand found for user to link Zoho account')
    }

    // Link to brand
    await prisma.socialAccountBrand.upsert({
      where: {
        brandId_socialAccountId: {
          brandId: userBrand.brandId,
          socialAccountId: account.id,
        },
      },
      update: {
        connectedByUserId: token.id
      },
      create: {
        brandId: userBrand.brandId,
        socialAccountId: account.id,
        connectedByUserId: token.id
      },
    })

    // Link to user
    await prisma.userSocialAccount.upsert({
      where: {
        userId_socialAccountId: {
          userId: token.id,
          socialAccountId: account.id,
        },
      },
      update: {},
      create: {
        userId: token.id,
        socialAccountId: account.id,
      },
    })

    console.log('Zoho account successfully connected');
    
    const dashboardUrl = new URL('/accounts', req.nextUrl.origin)
    dashboardUrl.searchParams.set('success', 'zoho_connected')
    return NextResponse.redirect(dashboardUrl.toString())
    
  } catch (error) {
    console.error('Zoho callback error:', error);
    const errorUrl = new URL('/accounts', req.nextUrl.origin)
    errorUrl.searchParams.set('error', error instanceof Error ? error.message : 'Unknown Zoho error')
    return NextResponse.redirect(errorUrl.toString())
  }
}