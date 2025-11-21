import { prisma } from "@/lib/prisma";
import { isTokenExpired } from "@/utils/token";
import { decryptToken } from "@/lib/encryption";
import type { Post, Media, SocialAccount } from "@prisma/client";

export async function publishToTikTok(
    post: Post & { media?: Media[] }
): Promise<{ id: string }> {
    try {
        if (!post) throw new Error('Invalid input');

        const userSocialAccount = await prisma.userSocialAccount.findFirst({
            where: {
            OR: [
                {
                userId: post.userId,
                socialAccount: {
                    platform: 'TIKTOK',
                    brands: {
                    some: {
                        brandId: post.brandId
                    }
                    }
                }
                },
                {
                socialAccount: {
                    platform: 'TIKTOK',
                    brands: {
                    some: {
                        brandId: post.brandId
                    }
                    }
                },
                user: {
                    brands: {
                    some: {
                        brandId: post.brandId
                    }
                    }
                }
                }
            ]
            },
            include: {
            socialAccount: true,
            user: true
            }
        });
    
    
        if (!userSocialAccount) {
            await prisma.post.update({
            where: { id: post.id },
            data: { 
                status: "FAILED",
                updatedAt: new Date()
            }
            });
    
            await prisma.notification.create({
            data: {
                userId: post.userId,
                type: "POST_FAILED",
                title: "Post Failed",
                message: "Failed to publish your post on TikTok - no connected account for this brand",
                metadata: {
                postId: post.id,
                platform: "TIKTOK"
                }
            }
            });
    
            throw new Error('User has no connected TikTok account for this brand');
        }
    
        const socialAccount = userSocialAccount.socialAccount;
        socialAccount.accessToken = await decryptToken(socialAccount.accessToken);
        if(socialAccount.refreshToken) {
            socialAccount.refreshToken = await decryptToken(socialAccount.refreshToken);
        }
        
        if (isTokenExpired(socialAccount.tokenExpiresAt)) {
            throw new Error('TikTok access token is expired');
        }

        const media = post.media || await prisma.media.findMany({
            where: { postId: post.id }
        });

        if(media && media[0].type == "IMAGE") {
            await publishImage(post, media, socialAccount);
        } else if(media && media[0].type == "VIDEO") {
            await publishVideo(post, media, socialAccount);
        } else {
            throw new Error('Unsupported media type');
        }

        return { id: post.id };
    } catch (error) {
        console.error("Error in publishing to LinkedIn:", error);
        throw error;
    }
}

async function publishVideo(
    post: Post,
    media: Media[],
    account: SocialAccount 
) {  
    try {
        const cloudinaryUrl = media[0].url;
        
        // First, get the file information from Cloudinary
        const fileResponse = await fetch(cloudinaryUrl);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch video from Cloudinary: ${fileResponse.status}`);
        }

        const fileBuffer = await fileResponse.arrayBuffer();
        const fileSize = fileBuffer.byteLength;
        
        // Calculate chunking parameters according to TikTok requirements
        const chunkSize = calculateChunkSize(fileSize);
        const totalChunkCount = Math.ceil(fileSize / chunkSize);

        console.log(`File size: ${fileSize}, Chunk size: ${chunkSize}, Total chunks: ${totalChunkCount}`);

        // Step 1: Initialize the upload with TikTok
        const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${account.accessToken}`
            },
            body: JSON.stringify({
                post_info: {
                    title: post.title,
                    privacy_level: "SELF_ONLY", // Make sure this is included
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                    video_cover_timestamp_ms: 1000
                },
                source_info: {
                    source: "FILE_UPLOAD",
                    video_size: fileSize,
                    chunk_size: chunkSize,
                    total_chunk_count: totalChunkCount
                }
            })
        });

        console.log('Init response status:', initResponse.status);
        
        if (!initResponse.ok) {
            const errorText = await initResponse.text();
            console.error('Init error response:', errorText);
            throw new Error(`HTTP error during init! Status: ${initResponse.status}, Response: ${errorText}`);
        }

        const initData = await initResponse.json();
        console.log("Init Response Data:", initData);

        // Check if we got the upload URL from the response
        if (!initData.data?.upload_url) {
            throw new Error('No upload URL received from TikTok initialization');
        }

        const uploadUrl = initData.data.upload_url;
        const publishId = initData.data.publish_id;

        // Step 2: Upload the file in chunks using the upload_url
        for (let chunkIndex = 0; chunkIndex < totalChunkCount; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, fileSize);
            const chunk = fileBuffer.slice(start, end);
            const chunkSizeBytes = end - start;

            // Calculate content range
            const firstByte = start;
            const lastByte = end - 1; // inclusive

            console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunkCount}, bytes ${firstByte}-${lastByte}/${fileSize}`);

            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`,
                    'Content-Type': 'video/mp4', // Adjust based on your actual file type
                    'Content-Length': chunkSizeBytes.toString(),
                    'Content-Range': `bytes ${firstByte}-${lastByte}/${fileSize}`
                },
                body: chunk
            });

            console.log(`Chunk ${chunkIndex + 1} upload status:`, uploadResponse.status);

            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                throw new Error(`HTTP error during chunk ${chunkIndex} upload! Status: ${uploadResponse.status}, Response: ${errorText}`);
            }

            // Check if this is the final chunk (should return 201)
            if (chunkIndex === totalChunkCount - 1) {
                if (uploadResponse.status !== 201) {
                    throw new Error(`Final chunk should return 201, got ${uploadResponse.status}`);
                }
                console.log('All chunks uploaded successfully');
            } else {
                // For non-final chunks, expect 206
                if (uploadResponse.status !== 206) {
                    console.warn(`Expected status 206 for chunk ${chunkIndex}, got ${uploadResponse.status}`);
                }
            }
        }

        // Step 3: Finalize the upload (if needed - check API docs if this step is required)
        // Some TikTok APIs automatically finalize after upload, others require explicit finalize
        try {
            const finalizeResponse = await fetch(`https://open.tiktokapis.com/v2/post/publish/video/finalize/?publish_id=${publishId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${account.accessToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (finalizeResponse.ok) {
                const finalizeData = await finalizeResponse.json();
                console.log("Finalize Response Data:", finalizeData);
                return finalizeData;
            } else {
                console.log('Finalize not required or failed, but upload may still be successful');
            }
        } catch (finalizeError) {
            console.log('Finalize step skipped or failed:', finalizeError);
        }

        return initData;

    } catch (error) {
        console.error("Error in publishing video:", error);
        throw error;
    }
}

// Helper function to calculate chunk size according to TikTok requirements
function calculateChunkSize(fileSize: number): number {
    // TikTok requirements:
    // - Each chunk must be at least 5 MB but no greater than 64 MB
    // - Final chunk can be up to 128 MB
    // - Videos < 5 MB must be uploaded as whole
    // - Videos > 64 MB must be chunked
    // - Max 1000 chunks
    
    const MIN_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_CHUNK_SIZE = 64 * 1024 * 1024; // 64MB
    const MAX_CHUNKS = 1000;

    if (fileSize <= MIN_CHUNK_SIZE) {
        // Small files: upload as whole
        return fileSize;
    }

    // Calculate optimal chunk size
    let chunkSize = Math.max(MIN_CHUNK_SIZE, Math.ceil(fileSize / MAX_CHUNKS));
    chunkSize = Math.min(chunkSize, MAX_CHUNK_SIZE);
    
    // Ensure chunkSize is reasonable
    const chunkCount = Math.ceil(fileSize / chunkSize);
    if (chunkCount > MAX_CHUNKS) {
        // If still too many chunks, increase chunk size
        chunkSize = Math.ceil(fileSize / MAX_CHUNKS);
    }

    return chunkSize;
}

async function publishImage(
    post: Post,
    media: Media[],
    account: SocialAccount 
) {

}