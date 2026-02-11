import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { uploadFile } from './upload';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

export const uploadImage = async (file: File, folder: string = 'profile_pics') => {
    // Use unified upload with Local CDN as primary, Cloudinary as fallback
    return await uploadFile(file, folder);
}

export default cloudinary;