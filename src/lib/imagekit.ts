// lib/imagekit.ts
import ImageKit from 'imagekit';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// ImageKit configuration
export const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || 'public_dw7vJ8uXRHXID7wIU3vNZRlJHI0=',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || 'private_kIJMWEv7Z6pXrjkvF/V7yk6zvf4=',
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/vvptcdf7m',
});


// Cloudinary configuration (fallback)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image with Local CDN as primary and Cloudinary as fallback
export async function uploadImage(file: File, folder: string = 'prompt-directory'): Promise<string> {
  try {
    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Try Local CDN first
    try {
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'application/octet-stream';
      const base64Data = `data:${mimeType};base64,${base64}`;
      
      const { uploadToLocalCDN } = await import('./uploadToLocalCDN');
      const result = await uploadToLocalCDN({
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          lastModified: file.lastModified || Date.now(),
        },
        base64Data,
      });
      
      console.log('Local CDN upload successful:', result.url);
      return result.url;
    } catch (localError) {
      console.warn('Local CDN upload failed, trying Cloudinary:', localError);
      
      // Fallback to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            folder: folder,
            public_id: `${Date.now()}_${file.name.split('.')[0]}`,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(buffer);
      });
      
      console.log('Cloudinary fallback successful:', (result as UploadApiResponse).secure_url);
      return (result as UploadApiResponse).secure_url;
    }
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error('Failed to upload image');
  }
}

// Delete image from ImageKit
export async function deleteImageKit(fileId: string) {
  try {
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.warn('Failed to delete image from ImageKit:', error);
  }
}

// Delete image from Cloudinary
export async function deleteCloudinary(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.warn('Failed to delete image from Cloudinary:', error);
  }
}

// Get authentication parameters for ImageKit (for frontend uploads if needed)
export function getImageKitAuth() {
  const token = imagekit.getAuthenticationParameters();
  return token;
}