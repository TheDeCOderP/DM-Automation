// src/app/api/accounts/zoho/workdrive/files/route.ts
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { SocialAccount } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { decryptToken, encryptToken } from '@/lib/encryption';

const ZOHO_WORKDRIVE_API_URL = 'https://www.zohoapis.in/workdrive/api/v1'

interface ZohoFile {
  id: string
  name: string
  type: string
  is_folder: boolean
  size: number
  mime_type: string
  created_time: string
  modified_time: string
  download_url?: string
  thumbnail_url?: string
  extension?: string
  parent_id?: string
  is_shared?: boolean
  share_direction?: 'incoming' | 'outgoing'
  shared_by?: string
}

interface ZohoApiFile {
  id?: string
  type?: string
  attributes?: {
    id?: string
    name?: string
    display_name?: string
    type?: string
    is_folder?: boolean
    size?: number
    file_size?: number
    mime_type?: string
    content_type?: string
    created_time?: string
    created_at?: string
    modified_time?: string
    modified_at?: string
    download_url?: string
    permalink?: string
    thumbnail_url?: string
    extension?: string
    file_extension?: string
    parent_id?: string
    shared_by?: string
  }
  relationships?: {
    sharedby?: {
      data?: {
        attributes?: {
          display_name?: string
        }
      }
    }
  }
  share_direction?: 'incoming' | 'outgoing'
  is_shared?: boolean
  shared_by?: string
}

interface ZohoTokenResponse {
  access_token: string
  expires_in: string
  error?: string
}

interface ZohoUserResponse {
  data?: {
    id?: string
    attributes?: {
      zuid?: string
    }
  }
}

interface ZohoFilesResponse {
  data?: ZohoApiFile[]
}

// Helper function to refresh token if needed
async function refreshZohoToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new Error("Zoho refresh token is missing. User needs to re-authenticate.")
  }

  const refreshToken = await decryptToken(socialAccount.refreshToken);

  if (socialAccount.tokenExpiresAt && new Date() >= socialAccount.tokenExpiresAt) {
    const refreshRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })
    
    const data: ZohoTokenResponse = await refreshRes.json()
    
    if (!refreshRes.ok) {
      throw new Error(data.error || 'Failed to refresh token')
    }

    const { access_token, expires_in } = data
    const tokenExpiresAt = new Date(Date.now() + parseInt(expires_in) * 1000)

    const encryptedAccessToken = await encryptToken(access_token);

    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        tokenExpiresAt,
      },
    })

    return access_token
  }

  console.log("Using existing valid Zoho token")
  return socialAccount.accessToken
}

// Helper function to get user ID
async function getCurrentUserId(accessToken: string): Promise<string | null> {
  try {
    const userRes = await fetch(`${ZOHO_WORKDRIVE_API_URL}/users/me`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    })
    const data: ZohoUserResponse = await userRes.json()
    return data?.data?.id || data?.data?.attributes?.zuid || null
  } catch {
    return null
  }
}

// Helper function to get shared files
async function getSharedFiles(accessToken: string): Promise<ZohoApiFile[]> {
  try {
    const userId = await getCurrentUserId(accessToken)
    if (!userId) throw new Error('Could not get current user ID')

    const incomingRes = await fetch(`${ZOHO_WORKDRIVE_API_URL}/users/${userId}/incomingfiles`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    });
    
    const incomingData: ZohoFilesResponse = await incomingRes.json()
    const incomingFiles: ZohoApiFile[] = incomingData?.data || []

    return incomingFiles.map(file => ({
      ...file,
      share_direction: 'incoming' as const,
      is_shared: true,
      shared_by: file.attributes?.shared_by || file.relationships?.sharedby?.data?.attributes?.display_name,
    }))
  } catch {
    return []
  }
}

// Helper function to get folder contents
async function getFolderContents(accessToken: string, folderId: string): Promise<ZohoApiFile[]> {
  try {
    const folderRes = await fetch(`${ZOHO_WORKDRIVE_API_URL}/files/${folderId}/files`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    })
    
    const folderData: ZohoFilesResponse = await folderRes.json()
    
    if (!folderRes.ok) {
      throw new Error('Failed to fetch folder contents')
    }
    
    return (folderData?.data || []).map((file: ZohoApiFile) => ({
      ...file,
      is_shared: false,
    }))
  } catch (error) {
    console.error(`Error fetching folder ${folderId}:`, error)
    throw error
  }
}

// Helper function to transform file data
function transformFileData(file: ZohoApiFile): ZohoFile {
  const attributes = file.attributes || {}
  
  return {
    id: file.id || attributes.id || '',
    name: attributes.name || attributes.display_name || 'Untitled',
    type: file.type || (attributes.is_folder ? 'folder' : 'file') || attributes.type || 'file',
    is_folder: attributes.is_folder || file.type === 'folder' || attributes.type === 'folder' || false,
    size: attributes.size || attributes.file_size || 0,
    mime_type: attributes.mime_type || attributes.content_type || '',
    created_time: attributes.created_time || attributes.created_at || '',
    modified_time: attributes.modified_time || attributes.modified_at || '',
    download_url: attributes.download_url || attributes.permalink || '',
    thumbnail_url: attributes.thumbnail_url || '',
    extension: attributes.extension || attributes.file_extension || '',
    parent_id: attributes.parent_id || '',
    is_shared: file.is_shared || false,
    share_direction: file.share_direction,
    shared_by: file.shared_by,
  }
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId') || 'shared'
  const includeShared = searchParams.get('includeShared') === 'true'

  try {

    const account = await prisma.socialAccount.findFirst({
      where: {
        platform: 'ZOHO_WORKDRIVE',
        brands: {
          some: {
            brand: {
              members: {
                some: {
                  userId: token.id,
                },
              },
            },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'No Zoho WorkDrive account connected' }, { status: 400 });
    }

    const accessToken = await refreshZohoToken(account)

    let files: ZohoFile[] = []

    if (folderId === 'shared') {
      const sharedFilesData = await getSharedFiles(accessToken)
      files = sharedFilesData.map(transformFileData)
    } else {
      try {
        const folderContents = await getFolderContents(accessToken, folderId)
        files = folderContents.map(transformFileData)

        if (includeShared) {
          const sharedFilesData = await getSharedFiles(accessToken)
          files = [...files, ...sharedFilesData.map(transformFileData)]
        }
      } catch {
        const sharedFilesData = await getSharedFiles(accessToken)
        files = sharedFilesData.map(transformFileData)
      }
    }

    files.sort((a, b) => {
      if (a.is_folder && !b.is_folder) return -1
      if (!a.is_folder && b.is_folder) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      success: true,
      files,
      total: files.length,
      folder_id: folderId,
      regular_files: files.filter(f => !f.is_shared).length,
      shared_files: files.filter(f => f.is_shared).length,
      account: { id: account.id, username: account.platformUsername },
      pagination: { has_more: files.length === 1000, limit: 1000 },
    })
  } catch (error) {
    console.error('Zoho WorkDrive API error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch files',
        details: error instanceof Error ? error.message : 'Unknown error',
        note: 'Your WorkDrive trial may have expired. Shared files might still be accessible.',
      },
      { status: 500 }
    )
  }
}