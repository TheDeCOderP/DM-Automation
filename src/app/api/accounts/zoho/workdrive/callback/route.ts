import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'
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
  const encodedState = searchParams.get('state')

  if (!encodedState) {
    const errorUrl = new URL('/auth/error', req.nextUrl.origin)
    errorUrl.searchParams.set('message', 'invalid_state')
    return NextResponse.redirect(errorUrl.toString())
  }

  if (!code) {
    const errorUrl = new URL('/auth/error', req.nextUrl.origin)
    errorUrl.searchParams.set('message', 'missing_code')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
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
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      throw new Error(`Token exchange failed: ${tokenData.error || 'Unknown error'}`)
    }

    const expiresInSeconds = parseInt(expires_in.toString())
    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000)

    let userData
    let userInfo
    let zohoUserId
    let zohoUsername

    try {
      const profileRes = await fetch(ZOHO_WORKDRIVE_USER_URL, {
        headers: {
          Authorization: `Zoho-oauthtoken ${access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      })
      userData = await profileRes.json()
      userInfo = userData.data || userData
      zohoUserId =
        userInfo.id ||
        userInfo.user_id ||
        userInfo.zuid ||
        userInfo.user_id
      zohoUsername =
        userInfo.display_name ||
        userInfo.name ||
        userInfo.email_id ||
        userInfo.email
    } catch {
      try {
        const accountsRes = await fetch('https://accounts.zoho.in/oauth/user/info', {
          headers: {
            Authorization: `Zoho-oauthtoken ${access_token}`,
            Accept: 'application/json',
          },
        })
        userData = await accountsRes.json()
        userInfo = userData
        zohoUserId = userInfo.ZUID || userInfo.user_id || userInfo.id
        zohoUsername = userInfo.Display_Name || userInfo.Full_Name || userInfo.Email
      } catch {
        try {
          const tokenInfoRes = await fetch(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token/info`, {
            headers: {
              Authorization: `Zoho-oauthtoken ${access_token}`,
            },
          })
          userData = await tokenInfoRes.json()
          zohoUserId = userData.user_id || userData.client_id || `zoho_${Date.now()}`
          zohoUsername = userData.user_name || 'Zoho User'
        } catch {
          zohoUserId = `zoho_workdrive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          zohoUsername = 'Zoho WorkDrive User'
        }
      }
    }

    if (!zohoUserId) {
      throw new Error('Failed to retrieve or generate unique Zoho User ID')
    }

    const account = await prisma.socialAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: 'ZOHO_WORKDRIVE',
          platformUserId: zohoUserId,
        },
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        platformUsername: zohoUsername,
      },
      create: {
        platform: 'ZOHO_WORKDRIVE',
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenExpiresAt,
        platformUserId: zohoUserId,
        platformUsername: zohoUsername,
      },
    })

    const brand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
      },
    })

    if (!brand) {
      throw new Error('No brand found for user to link Zoho account')
    }

    await prisma.socialAccountBrand.upsert({
      where: {
        brandId_socialAccountId: {
          brandId: brand.id,
          socialAccountId: account.id,
        },
      },
      update: {},
      create: {
        brandId: brand.id,
        socialAccountId: account.id,
      },
    })

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

    const dashboardUrl = new URL('/accounts', req.nextUrl.origin)
    dashboardUrl.searchParams.set('zoho', 'connected')
    return NextResponse.redirect(dashboardUrl.toString())
  } catch (error) {
    const errorUrl = new URL('/auth/error', req.nextUrl.origin)
    errorUrl.searchParams.set('message', error instanceof Error ? error.message : 'Unknown Zoho error')
    return NextResponse.redirect(errorUrl.toString())
  }
}
