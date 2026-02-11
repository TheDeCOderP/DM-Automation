// Unified upload utility with Local CDN as primary and Cloudinary as fallback
import { uploadToLocalCDN } from './uploadToLocalCDN';
import cloudinary from './cloudinary';
import type { UploadApiResponse } from 'cloudinary';

/**
 * Upload file with Local CDN as primary and Cloudinary as fallback
 * @param file - File object to upload
 * @param folder - Folder name for organization (used in Cloudinary fallback)
 * @returns Promise with the uploaded file URL
 */
export async function uploadFile(file: File, folder: string = 'uploads'): Promise<string> {
  try {
    console.log(`[Upload] Attempting to upload to Local CDN: ${file.name}`);
    
    // Convert File to base64 for local CDN
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'application/octet-stream';
    const base64Data = `data:${mimeType};base64,${base64}`;
    
    // Try Local CDN first
    try {
      const result = await uploadToLocalCDN({
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified || Date.now(),
        },
        base64Data,
      });
      
      console.log(`[Upload] Local CDN upload successful: ${result.url}`);
      return result.url;
    } catch (localError) {
      console.warn('[Upload] Local CDN upload failed, falling back to Cloudinary:', localError);
      
      // Fallback to Cloudinary
      const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as UploadApiResponse);
            }
          )
          .end(buffer);
      });
      
      console.log(`[Upload] Cloudinary fallback successful: ${uploadResult.secure_url}`);
      return uploadResult.secure_url;
    }
  } catch (error) {
    console.error('[Upload] All upload methods failed:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload base64 data with Local CDN as primary and Cloudinary as fallback
 * @param base64Data - Base64 encoded data (with or without data URL prefix)
 * @param fileName - Name for the file
 * @param folder - Folder name for organization (used in Cloudinary fallback)
 * @returns Promise with the uploaded file URL
 */
export async function uploadBase64(
  base64Data: string,
  fileName: string = `upload-${Date.now()}`,
  folder: string = 'uploads'
): Promise<string> {
  try {
    console.log(`[Upload] Attempting to upload base64 to Local CDN: ${fileName}`);
    
    // Extract mime type and base64 data
    let mimeType = 'image/jpeg';
    let base64 = base64Data;
    
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64 = matches[2];
    }
    
    // Try Local CDN first
    try {
      const result = await uploadToLocalCDN({
        file: {
          name: fileName,
          type: mimeType,
          size: Buffer.from(base64, 'base64').length,
          lastModified: Date.now(),
        },
        base64Data,
      });
      
      console.log(`[Upload] Local CDN upload successful: ${result.url}`);
      return result.url;
    } catch (localError) {
      console.warn('[Upload] Local CDN upload failed, falling back to Cloudinary:', localError);
      
      // Fallback to Cloudinary
      const uploadResult = await cloudinary.uploader.upload(base64Data, {
        folder,
        resource_type: 'auto',
        quality: 'auto',
        fetch_format: 'auto',
      });
      
      console.log(`[Upload] Cloudinary fallback successful: ${uploadResult.secure_url}`);
      return uploadResult.secure_url;
    }
  } catch (error) {
    console.error('[Upload] All upload methods failed:', error);
    throw new Error(`Failed to upload base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload with stream (for large files) - Cloudinary only
 * Local CDN doesn't support streaming, so this goes directly to Cloudinary
 * @param buffer - Buffer data
 * @param folder - Folder name for organization
 * @returns Promise with the uploaded file URL
 */
export async function uploadStream(buffer: Buffer, folder: string = 'uploads'): Promise<string> {
  try {
    console.log(`[Upload] Uploading stream to Cloudinary (Local CDN doesn't support streaming)`);
    
    const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as UploadApiResponse);
          }
        )
        .end(buffer);
    });
    
    console.log(`[Upload] Cloudinary stream upload successful: ${uploadResult.secure_url}`);
    return uploadResult.secure_url;
  } catch (error) {
    console.error('[Upload] Stream upload failed:', error);
    throw new Error(`Failed to upload stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export for backward compatibility
export { uploadToLocalCDN };
export default { uploadFile, uploadBase64, uploadStream };
