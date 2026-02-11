import { generateImage as generateGeminiImage } from '@/lib/gemini';
import { uploadBase64 } from '@/lib/upload';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const data = await req.json();
        const { prompt, aspectRatio = '1:1', referenceImageBase64 } = data;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        // If reference image is provided, extract dimensions and calculate aspect ratio
        let finalAspectRatio = aspectRatio;
        if (referenceImageBase64) {
            try {
                const dimensions = await getImageDimensions(referenceImageBase64);
                finalAspectRatio = calculateAspectRatio(dimensions.width, dimensions.height);
                console.log(`Reference image dimensions: ${dimensions.width}x${dimensions.height}, calculated aspect ratio: ${finalAspectRatio}`);
            } catch (error) {
                console.error("Error processing reference image:", error);
                // Continue with default aspect ratio if reference image processing fails
            }
        }

        const response = await generateImage(prompt, finalAspectRatio);
        
        if (!response) {
            return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
        }

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

async function getImageDimensions(base64Image: string): Promise<{ width: number; height: number }> {
    // Remove data URL prefix if present
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Simple PNG dimension extraction (first 24 bytes contain dimensions)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
    }
    
    // Simple JPEG dimension extraction
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
        let offset = 2;
        while (offset < buffer.length) {
            if (buffer[offset] !== 0xFF) break;
            
            const marker = buffer[offset + 1];
            offset += 2;
            
            if (marker === 0xC0 || marker === 0xC2) {
                const height = buffer.readUInt16BE(offset + 1);
                const width = buffer.readUInt16BE(offset + 3);
                return { width, height };
            }
            
            const segmentLength = buffer.readUInt16BE(offset);
            offset += segmentLength;
        }
    }
    
    throw new Error("Unable to extract image dimensions");
}

function calculateAspectRatio(width: number, height: number): '1:1' | '16:9' | '9:16' | '4:3' | '3:4' {
    const ratio = width / height;
    
    // Define tolerance for aspect ratio matching
    const tolerance = 0.1;
    
    if (Math.abs(ratio - 1) < tolerance) return '1:1';
    if (Math.abs(ratio - 16/9) < tolerance) return '16:9';
    if (Math.abs(ratio - 9/16) < tolerance) return '9:16';
    if (Math.abs(ratio - 4/3) < tolerance) return '4:3';
    if (Math.abs(ratio - 3/4) < tolerance) return '3:4';
    
    // Default to closest match
    if (ratio > 1.5) return '16:9';
    if (ratio < 0.7) return '9:16';
    if (ratio > 1) return '4:3';
    return '3:4';
}

async function generateImage(prompt: string, aspectRatio: string = '1:1') {
    try {
        console.log('Generating image with Gemini (latest API)...');
        
        // Enhanced prompt for better social media images
        const enhancedPrompt = `Create a high-quality, professional, visually appealing image for social media posting. 
        Style: Modern, clean, eye-catching, suitable for ${aspectRatio} aspect ratio.
        Description: ${prompt}
        
        The image should be:
        - High resolution and sharp
        - Well-composed with good lighting
        - Suitable for social media platforms (Facebook, Instagram, LinkedIn, Twitter)
        - Engaging and attention-grabbing
        - Professional quality
        - Vibrant colors and clear details`;

        // Generate image using Gemini's latest API
        const result = await generateGeminiImage(enhancedPrompt, {
            aspectRatio: aspectRatio as any,
            numberOfImages: 1
        });

        if (!result.images || result.images.length === 0) {
            throw new Error("No image generated by Gemini");
        }

        const imageBase64 = result.images[0];
        console.log("Image generated successfully with Gemini (gemini-3-pro-image-preview)");
        console.log("Generated text:", result.text);

        // Upload to Local CDN (with Cloudinary fallback)
        const base64Data = `data:image/png;base64,${imageBase64}`;
        const fileName = `ai-generated-${Date.now()}.png`;
        
        const imageUrl = await uploadBase64(base64Data, fileName, 'ai-generated-images');
        console.log("Image uploaded successfully:", imageUrl);
        
        return {
            imageUrl,
            imageBase64,
            provider: 'gemini-3-pro-image',
            aspectRatio,
            description: result.text || 'Image generated successfully'
        };
        
    } catch (error) {
        console.error("Error generating image with Gemini:", error);
        
        // Log detailed error information
        if (error instanceof Error) {
            console.error("Error details:", error.message);
            console.error("Error stack:", error.stack);
        }
        
        return null;
    }
}