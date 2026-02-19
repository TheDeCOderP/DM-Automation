// src/app/api/accounts/zoho/workdrive/files/route.ts
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { isTokenExpired, refreshAccessToken } from "@/utils/token";
import { decryptToken } from '@/lib/encryption';
import { ZohoFile, ZohoApiFile, ZohoFilesResponse } from '@/types/zoho';

const ZOHO_WORKDRIVE_API_URL = 'https://www.zohoapis.in/workdrive/api/v1';

/**
 * Fetch shared files for a user
 */
async function getSharedFiles(accessToken: string, userId: string): Promise<ZohoApiFile[]> {
  try {
    const response = await fetch(`${ZOHO_WORKDRIVE_API_URL}/users/${userId}/incomingfiles`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch shared files');
    }

    const data: ZohoFilesResponse = await response.json();
    const incomingFiles: ZohoApiFile[] = data?.data || [];

    return incomingFiles.map(file => ({
      ...file,
      share_direction: 'incoming' as const,
      is_shared: true,
      shared_by: file.attributes?.shared_by || file.relationships?.sharedby?.data?.attributes?.display_name,
    }));
  } catch (error) {
    console.error('Error fetching shared files:', error);
    throw new Error('Failed to fetch shared files');
  }
}

/**
 * Fetch folder contents
 */
async function getFolderContents(accessToken: string, folderId: string): Promise<ZohoApiFile[]> {
  try {
    const response = await fetch(`${ZOHO_WORKDRIVE_API_URL}/files/${folderId}/files`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch folder contents');
    }

    const data: ZohoFilesResponse = await response.json();
    return (data?.data || []).map((file: ZohoApiFile) => ({
      ...file,
      is_shared: false,
    }));
  } catch (error) {
    console.error(`Error fetching folder ${folderId}:`, error);
    throw new Error('Failed to fetch folder contents');
  }
}

/**
 * Transform API file data to consistent format
 */
function transformFileData(file: ZohoApiFile): ZohoFile {
  const attributes = file.attributes || {};
  
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
  };
}

/**
 * Sort files: folders first, then by name
 */
function sortFiles(files: ZohoFile[]): ZohoFile[] {
  return [...files].sort((a, b) => {
    if (a.is_folder && !b.is_folder) return -1;
    if (!a.is_folder && b.is_folder) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId') || 'shared';
    const includeShared = searchParams.get('includeShared') === 'true';

    // Get user's Zoho WorkDrive account through UserSocialAccount
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId: token.id,
        socialAccount: {
          platform: 'ZOHO_WORKDRIVE'
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccount) {
      return NextResponse.json({ error: 'No Zoho WorkDrive account connected' }, { status: 400 });
    }

    const socialAccount = userSocialAccount.socialAccount;

    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    // Token refresh
    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshAccessToken(socialAccount);
    }

    let files: ZohoFile[] = [];

    if (folderId === 'shared') {
      const sharedFilesData = await getSharedFiles(accessToken, socialAccount.platformUserId);
      files = sharedFilesData.map(transformFileData);
    } else {
      const folderContents = await getFolderContents(accessToken, folderId);
      files = folderContents.map(transformFileData);

      if (includeShared) {
        const sharedFilesData = await getSharedFiles(accessToken, socialAccount.platformUserId);
        files.push(...sharedFilesData.map(transformFileData));
      }
    }

    const sortedFiles = sortFiles(files);

    return NextResponse.json({
      success: true,
      files: sortedFiles,
      total: sortedFiles.length,
      folder_id: folderId,
      regular_files: sortedFiles.filter(f => !f.is_shared).length,
      shared_files: sortedFiles.filter(f => f.is_shared).length,
      account: { id: socialAccount.id, username: socialAccount.platformUsername },
      pagination: { has_more: sortedFiles.length === 1000, limit: 1000 },
    });

  } catch (error) {
    console.error('Zoho WorkDrive API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}