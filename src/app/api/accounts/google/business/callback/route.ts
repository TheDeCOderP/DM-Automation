// app/api/accounts/google/business/callback/route.ts
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/encryption'

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/google/business/callback`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const { userId, brandId } = JSON.parse(state!)

  if (!code) {
    return NextResponse.redirect(new URL('/auth/error?message=missing_code', process.env.NEXTAUTH_URL))
  }

  try {
    /** 1️⃣ Exchange code for Google Tokens */
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_BUSINESS_PROFILE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenRes.ok) throw new Error(tokenData.error_description || 'Token exchange failed')

    // Encrypt both tokens. Google access tokens expire in 1 hour (3600s).
    const encryptedAccessToken = await encryptToken(tokenData.access_token);
    let encryptedRefreshToken = null;
    if (tokenData.refresh_token) {
        encryptedRefreshToken = await encryptToken(tokenData.refresh_token);
    }
    
    const tokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    /** 2️⃣ Get user profile info */
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    })
    const profile = await profileRes.json()

    /** 3️⃣ Store in DB using the PLATFORM enum */
    if (userId && brandId) {
      // Prepare update object. Only update refresh token if Google sent a new one.
      const updateData: any = {
        accessToken: encryptedAccessToken,
        tokenExpiresAt,
        platformUsername: profile.name,
      }
      if (encryptedRefreshToken) {
        updateData.refreshToken = encryptedRefreshToken;
      }

      const account = await prisma.socialAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: 'GOOGLE_BUSINESS_PROFILE',
            platformUserId: profile.id,
          },
        },
        update: updateData,
        create: {
          platform: 'GOOGLE_BUSINESS_PROFILE',
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          platformUserId: profile.id,
          platformUsername: profile.name,
        },
      })

      // Link to brand and user (same as your Facebook logic)
      await prisma.socialAccountBrand.upsert({
        where: { brandId_socialAccountId: { brandId, socialAccountId: account.id } },
        update: { connectedByUserId: userId },
        create: { brandId, socialAccountId: account.id, connectedByUserId: userId },
      })

      await prisma.userSocialAccount.upsert({
        where: { userId_socialAccountId: { userId, socialAccountId: account.id } },
        update: {},
        create: { userId, socialAccountId: account.id }
      })
    }

    return NextResponse.redirect(new URL('/accounts?gbp=connected', process.env.NEXTAUTH_URL))
  } catch (error) {
    console.error('GBP callback error:', error)
    return NextResponse.redirect(new URL(`/auth/error?message=${encodeURIComponent((error as Error).message)}`, process.env.NEXTAUTH_URL))
  }
}