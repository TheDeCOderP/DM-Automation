// app/api/accounts/reddit/callback/route.ts
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { encryptToken } from '@/lib/encryption'

const redirectUri = `${process.env.NEXTAUTH_URL}/api/accounts/reddit/callback`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin)
    errorUrl.searchParams.set('message', `Reddit auth failed: ${error}`)
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code || !state) {
    const errorUrl = new URL('/auth/error', request.nextUrl.origin)
    errorUrl.searchParams.set('message', 'missing_code_or_state')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    const { userId, brandId } = JSON.parse(state)

    /** 1️⃣ Exchange code for access token */
    const authString = Buffer.from(
      `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
    ).toString('base64')

    const tokenRes = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`)
    }

    const { access_token: accessToken, refresh_token: refreshToken, expires_in } = tokenData

    // Encrypt tokens
    const encryptedAccessToken = await encryptToken(accessToken)
    const encryptedRefreshToken = refreshToken ? await encryptToken(refreshToken) : null

    // Calculate expiration
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000))

    /** 2️⃣ Get user profile */
    const profileRes = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': process.env.REDDIT_USER_AGENT || 'NextJS-App/1.0'
      }
    })

    if (!profileRes.ok) {
      throw new Error('Failed to fetch Reddit profile')
    }

    const profile = await profileRes.json()

    /** 3️⃣ Store tokens in DB */
    const account = await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: 'REDDIT',
          platformUserId: profile.id,
        },
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        platformUsername: profile.name,
      },
      create: {
        platform: 'REDDIT',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt,
        platformUserId: profile.id,
        platformUsername: profile.name,
      },
    })

    // Link the social account with the brand
    if (brandId) {
      await prisma.socialAccountBrand.upsert({
        where: {
          brandId_socialAccountId: {
            brandId,
            socialAccountId: account.id,
          },
        },
        update: {},
        create: {
          brandId,
          socialAccountId: account.id,
        },
      })
    }

    // Link the social account to the user
    await prisma.userSocialAccount.upsert({
      where: {
        userId_socialAccountId: {
          userId,
          socialAccountId: account.id
        },
      },
      update: {},
      create: {
        userId,
        socialAccountId: account.id
      }
    })

    /** 4️⃣ Redirect back to dashboard */
    const dashboardUrl = new URL('/accounts', request.nextUrl.origin)
    dashboardUrl.searchParams.set('reddit', 'connected')
    return NextResponse.redirect(dashboardUrl.toString())

  } catch (error) {
    console.error('Reddit callback error:', error)
    const errorUrl = new URL('/auth/error', request.nextUrl.origin)
    errorUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Unknown error'
    )
    return NextResponse.redirect(errorUrl.toString())
  }
}