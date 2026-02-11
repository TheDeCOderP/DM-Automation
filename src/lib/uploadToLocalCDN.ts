// Using native fetch and FormData (available in Node.js 18+)

const MEDIA_MANAGEMENT_URL = process.env.MEDIA_MANAGEMENT_URL || 'https://media-cdn.prabisha.com';
const MEDIA_UPLOAD_FOLDER = process.env.MEDIA_UPLOAD_FOLDER || 'prabisha-dma';

export async function uploadToLocalCDN({
  file,
  base64Data,
}: {
  file: { name: string; type: string; size: number; lastModified: number };
  base64Data: string;
}): Promise<{ url: string }> {
  try {
    // Debug: log the first 100 chars
    // Processing upload data
    
    let mimeType, base64;
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64 = matches[2];
    } else {
      // fallback: assume jpeg if no prefix
      mimeType = file.type || 'image/jpeg';
      base64 = base64Data;
      console.warn('[uploadToLocalCDN] No data URL prefix found, assuming image/jpeg');
    }
    
    const buffer = Buffer.from(base64, 'base64');
    
    // Create a Blob from the buffer for modern FormData
    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, file.name);
    
    // Send folder as query parameter instead of form data
    const uploadUrl = `${MEDIA_MANAGEMENT_URL}/upload?folder=${encodeURIComponent(MEDIA_UPLOAD_FOLDER)}`;
    
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('[uploadToLocalCDN] Upload failed:', res.status, errorText);
      throw new Error(`Local CDN upload failed: ${res.status} ${res.statusText}`);
    }
    
    const data: any = await res.json();
    console.log('[uploadToLocalCDN] Upload successful:', data.url);
    
    if (!data.success || !data.url) {
      throw new Error('No URL returned from local CDN');
    }
    
    return { url: data.url };
  } catch (error) {
    console.error('[uploadToLocalCDN] Error:', error);
    throw error;
  }
} 


