import { v2 as cloudinary, UploadApiResponse } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
})

export const uploadImage = async (file: File, folder: string = 'profile_pics') => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result =  await new Promise((resolve, reject) => {
        cloudinary.uploader
        .upload_stream({ folder }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
        })
        .end(buffer);
    });

    return (result as UploadApiResponse).secure_url;
}

export default cloudinary;