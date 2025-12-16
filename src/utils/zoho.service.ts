const BASE_URL = 'https://www.zohoapis.in/workdrive/api/v1';
const folder_id = "ny4k50b83dc85fd6a416aa246c053f9db2be6";

let accessToken = "1000.53671b03544d3734a7530a4b968838de.bd5d6e97fab0a457d3f3603e5bc2a65d";
let refreshToken = "1000.2e5643b9cd1009ccfe4451be4e1d46fa.6f5d19d0a7743ec1b05204673560c157";
let tokenExpiresAt = new Date();

export default async function uploadFile(file: File, parent_id: string = folder_id) {
    try {
        if(tokenExpiresAt < new Date()) {
            await refreshAccessToken();
        }
        console.log('Parent ID:', parent_id);
        // Create FormData instead of JSON
        const formData = new FormData();
        formData.append('filename', file.name);
        formData.append('parent_id', parent_id);
        formData.append('override-name-exist', 'true');
        formData.append('content', file); // This should be the actual File object

        const headers = {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Accept': 'application/vnd.api+json',
            // Don't set Content-Type - let the browser set it with boundary
        };

        // Use the correct endpoint /upload (not /files)
        const response = await fetch(`${BASE_URL}/upload`, {
            method: 'POST',
            headers,
            body: formData // Send FormData, not JSON
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                await refreshAccessToken();
                return uploadFile(file, parent_id);
            } else {
                const errorData = await response.json();
                console.error('Error while uploading file:', errorData);
                // Fix: Use the actual error message from the response
                throw new Error(errorData.errors?.[0]?.title || 'Upload failed');
            }
        }

        const data = await response.json();

        const resource_id = data.data?.[0]?.attributes?.resource_id;

        if (!resource_id) {
            throw new Error('Could not find resource_id in upload response.');
        }

        const publicUrl = await getPublicFileLink(resource_id);

        return publicUrl;
    } catch (error) {
        console.error('Error while uploading file:', error);
        throw error; // Re-throw the original error
    }
}

async function refreshAccessToken() {
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET) {
    throw new Error("Zoho client credentials are not configured.");
  }

  try {
    const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to refresh token');
    }

    const { access_token, expires_in } = data;

    accessToken = access_token;
    // Note: Zoho usually doesn't return a new refresh_token
    tokenExpiresAt = new Date(Date.now() + (expires_in * 1000));

  } catch (error) {
    console.error("Error refreshing Zoho token:", error);
    throw new Error('Failed to refresh Zoho token');
  }
}

export async function createFolder(folderName: string, parent_id: string = folder_id) {
    if(tokenExpiresAt < new Date()) {
        await refreshAccessToken();
    }

    const response = await fetch(`${BASE_URL}/files`, {
        method: 'POST',
        headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            data: {
                attributes: {
                    name: folderName,
                    parent_id: parent_id,
                },
                type: "files"
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Zoho API Error:', errorData);
        throw new Error(errorData.errors?.[0]?.title || 'Folder creation failed');
    }

    return response.json();
}

async function getPublicFileLink(resourceId: string): Promise<string> {
    try {
        if (tokenExpiresAt < new Date()) {
            await refreshAccessToken();
        }

        // First, get the file details to find the actual file URL
        const fileResponse = await fetch(`${BASE_URL}/files/${resourceId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Zoho-oauthtoken ${accessToken}`,
                'Accept': 'application/vnd.api+json'
            }
        });

        if (!fileResponse.ok) {
            throw new Error('Failed to get file details');
        }

        const fileData = await fileResponse.json();
        
        // This should give you a direct CDN-style URL
        const directUrl = fileData.data?.attributes?.download_url;
        
        if (directUrl) {
            return directUrl; // This should work directly in img tags!
        }

        // If no direct URL, try the content endpoint
        const contentUrl = `${BASE_URL}/files/${resourceId}/content`;
        
        // Test if this works as a direct image source
        return contentUrl;

    } catch (error) {
        console.error('Error getting direct file URL:', error);
        throw error;
    }
}