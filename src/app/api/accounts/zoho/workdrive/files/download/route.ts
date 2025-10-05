// src/app/api/accounts/zoho/workdrive/files/download/route.ts
import { prisma } from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

import { isTokenExpired } from "@/utils/token";
import { decryptToken, encryptToken } from '@/lib/encryption';

import { ZohoTokenResponse } from '@/types/zoho';
import type { SocialAccount } from '@prisma/client';

const ZOHO_WORKDRIVE_API_URL = 'https://www.zohoapis.in/workdrive/api/v1';

class ZohoApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ZohoApiError';
  }
}

/**
 * Refresh Zoho token if expired or about to expire
 */
async function refreshZohoToken(socialAccount: SocialAccount): Promise<string> {
  if (!socialAccount.refreshToken) {
    throw new ZohoApiError('Zoho refresh token is missing. User needs to re-authenticate.', 401);
  }

  try {
    const refreshRes = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        refresh_token: socialAccount.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data: ZohoTokenResponse = await refreshRes.json();
    
    if (!refreshRes.ok) {
      throw new ZohoApiError(data.error || 'Failed to refresh token', refreshRes.status);
    }

    const { access_token, expires_in } = data;
    const tokenExpiresAt = new Date(Date.now() + parseInt(expires_in) * 1000);
    const encryptedAccessToken = await encryptToken(access_token);

    await prisma.socialAccount.update({
      where: { id: socialAccount.id },
      data: {
        accessToken: encryptedAccessToken,
        tokenExpiresAt,
      },
    });

    return access_token;
  } catch (error) {
    if (error instanceof ZohoApiError) throw error;
    throw new ZohoApiError('Failed to refresh Zoho token', 500, error);
  }
}

/**
 * Get file metadata including download URL
 */
async function getFileMetadata(accessToken: string, fileId: string) {
  try {
    const response = await fetch(`${ZOHO_WORKDRIVE_API_URL}/files/${fileId}`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    });

    if (!response.ok) {
      throw new ZohoApiError('Failed to fetch file metadata', response.status);
    }

    const data = await response.json();
    return data?.data;
  } catch (error) {
    console.error('Error fetching file metadata:', error);
    throw new ZohoApiError('Failed to fetch file information', 500, error);
  }
}

/**
 * Download file from Zoho WorkDrive
 */
async function downloadFile(accessToken: string, fileId: string) {
  try {
    // First get file metadata to get download URL and filename
    const fileMetadata = await getFileMetadata(accessToken, fileId);
    const downloadUrl = fileMetadata?.attributes?.download_url;
    const fileName = fileMetadata?.attributes?.name || 'download';
    const mimeType = fileMetadata?.attributes?.mime_type;

    if (!downloadUrl) {
      throw new ZohoApiError('File download URL not available');
    }

    // Download the file
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new ZohoApiError(`Failed to download file: ${downloadResponse.statusText}`, downloadResponse.status);
    }

    const fileBlob = await downloadResponse.blob();

    return {
      blob: fileBlob,
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      contentDisposition: downloadResponse.headers.get('content-disposition'),
    };
  } catch (error) {
    if (error instanceof ZohoApiError) throw error;
    throw new ZohoApiError('Failed to download file from Zoho WorkDrive', 500, error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    const socialAccount = await prisma.socialAccount.findFirst({
        where: {
        platform: 'ZOHO_WORKDRIVE',
        brands: {
            some: {
            brand: {
                members: {
                some: { user: { id: token.id } },
                },
            },
            },
        },
        },
    });
    if (!socialAccount) {
        return NextResponse.json({ error: 'No Zoho WorkDrive account connected' }, { status: 400 });
    }

    socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
    if(socialAccount.refreshToken) {
        socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
    }

    // Token refresh
    let { accessToken } = socialAccount;
    if (isTokenExpired(socialAccount.tokenExpiresAt)) {
        accessToken = await refreshZohoToken(socialAccount);
    }

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 });
    }
    const { blob, fileName, mimeType, contentDisposition } = await downloadFile(accessToken, fileId);

    // Create response with file data
    const response = new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': blob.size.toString(),
        'Content-Disposition': contentDisposition || `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;

  } catch (error) {
    console.error('Zoho WorkDrive download error:', error);

    if (error instanceof ZohoApiError) {
      return NextResponse.json(
        {
          error: error.message,
          details: error.originalError instanceof Error ? error.originalError.message : undefined,
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to download file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}