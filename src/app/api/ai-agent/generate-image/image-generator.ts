import Together from 'together-ai';
import cloudinary from '@/lib/cloudinary';
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const togetherai = new Together({
    apiKey: process.env.TOGETHER_AI_API_KEY ?? '',
});

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const data = await req.json();
        const { prompt } = data;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const response = await generateImage(prompt);
        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function generateImage(prompt: string) {
    try {
        const response = await togetherai.images.create({
            prompt,
            width: 1024,
            height: 768,
            response_format: "base64",
            model: "black-forest-labs/FLUX.1-schnell",
        });

        if (!response.data || response.data.length === 0) {
            throw new Error("No image generated");
        }

        // Type guard to ensure we have base64 data
        const imageData = response.data[0];
        if (!('b64_json' in imageData)) {
            throw new Error("Expected base64 response but got URL instead");
        }

        const imageBase64 = imageData.b64_json;
        let imageUrl = '';

        if (imageBase64) {
            const base64Data = `data:image/png;base64,${imageBase64}`;
            
            const result = await cloudinary.uploader.upload(base64Data, {
                folder: "ai-generated-images",
                quality: "auto",
                fetch_format: "auto",
            });

            imageUrl = result.secure_url;
        }
        
        return {
            imageUrl,
            imageBase64
        };
        
    } catch (error) {
        console.error("Error generating image:", error);
        return null;
    }
}