import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const FREEPIK_API_KEY = process.env.FREEPIK_API_KEY;
const FREEPIK_API_BASE = "https://api.freepik.com/v1/ai";

const taskStatusMap = new Map();

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const data = await req.json();
        const { prompt, imageBase64 } = data;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        let finalImageBase64 = imageBase64;

        // Generate image if not provided
        if (!finalImageBase64) {
            console.log("No image provided, generating image first...");
            finalImageBase64 = await generateImage(prompt);
        }

        // Generate video from the image
        const videoResult = await generateVideoFromImage(finalImageBase64, prompt);
        
        return NextResponse.json(videoResult, { status: 200 });
    } catch (error) {
        console.error("Error in POST handler:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
}

async function generateImage(prompt: string): Promise<string> {
    try {
        // Simplified request body - remove problematic styling section
        // The 'realism' model already handles realistic output
        const requestBody = {
            prompt: prompt,
            resolution: "2k",
            aspect_ratio: "square_1_1",
            model: "realism",
            filter_nsfw: true,
            fixed_generation: false
            // Remove the styling section entirely - it's optional and causing issues
        };

        console.log("Generating image with prompt:", prompt);
        console.log("Request body:", JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(`${FREEPIK_API_BASE}/mystic`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-freepik-api-key": FREEPIK_API_KEY!,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Freepik Image API error:", response.status, errorText);
            throw new Error(`Freepik Image API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Freepik Image API response:", data);

        if (!data.data || !data.data.task_id) {
            throw new Error("No task ID received from Freepik Image API");
        }

        const taskId = data.data.task_id;
        
        // Poll for image generation completion
        const imageResult = await pollForImageCompletion(taskId);
        return imageResult;

    } catch (error) {
        console.error("Image generation error:", error);
        throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

async function pollForImageCompletion(taskId: string): Promise<string> {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            // Use the correct endpoint for mystic image task status
            const statusResponse = await fetch(`${FREEPIK_API_BASE}/mystic/${taskId}`, {
                method: "GET",
                headers: {
                    "x-freepik-api-key": FREEPIK_API_KEY!,
                },
            });

            if (!statusResponse.ok) {
                const errorText = await statusResponse.text();
                console.error(`Status check failed: ${statusResponse.status}`, errorText);
                throw new Error(`Status check failed: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();
            console.log(`Image generation status [${attempts + 1}]:`, statusData.data?.status);

            if (statusData.data?.status === 'COMPLETED' || statusData.data?.status === 'completed') {
                if (statusData.data?.generated?.[0]) {
                    const imageUrl = statusData.data.generated[0];
                    console.log("Fetching generated image from:", imageUrl);
                    
                    const imageResponse = await fetch(imageUrl);
                    if (!imageResponse.ok) {
                        throw new Error(`Failed to fetch generated image: ${imageResponse.status}`);
                    }
                    
                    const imageBuffer = await imageResponse.arrayBuffer();
                    const base64Image = Buffer.from(imageBuffer).toString('base64');
                    return `data:image/jpeg;base64,${base64Image}`;
                } else {
                    throw new Error("No image URL in completed task");
                }
            } else if (statusData.data?.status === 'failed' || statusData.data?.status === 'FAILED') {
                const errorMsg = statusData.data?.error || "Image generation failed";
                throw new Error(errorMsg);
            }

            // Wait 5 seconds before next poll
            await new Promise(resolve => setTimeout(resolve, 5000));
            attempts++;

        } catch (error) {
            console.error("Error polling image status:", error);
            throw error;
        }
    }

    throw new Error("Image generation timeout - exceeded maximum attempts");
}

async function generateVideoFromImage(imageBase64: string, prompt: string) {
    try {
        // Remove data URL prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

        const requestBody = {
            image: base64Data,
            prompt: prompt,
            negative_prompt: "low quality, blurry, distorted, bad anatomy, watermark, text",
            duration: "5",
            cfg_scale: 0.5,
            webhook_url: process.env.WEBHOOK_URL || null
        };

        console.log("Sending request to Freepik Video API...");
        
        const response = await fetch(`${FREEPIK_API_BASE}/image-to-video/kling-v2-5-pro`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-freepik-api-key": FREEPIK_API_KEY!,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Freepik Video API error:", response.status, errorText);
            throw new Error(`Freepik Video API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Freepik Video API response:", data);

        if (!data.data || !data.data.task_id) {
            throw new Error("No task ID received from Freepik Video API");
        }

        const taskId = data.data.task_id;
        
        // Store initial task status
        taskStatusMap.set(taskId, {
            status: 'processing',
            createdAt: new Date(),
            prompt: prompt
        });

        return {
            success: true,
            taskId: taskId,
            message: "Video generation started! Processing your video...",
        };
    } catch (error) {
        console.error("Video generation error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        };
    }
}

// Add endpoint to check video generation status
export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
        }

        // CORRECT ENDPOINT: Use image-to-video specific endpoint
        const statusResponse = await fetch(
            `${FREEPIK_API_BASE}/image-to-video/kling-v2-5-pro/${taskId}`, 
            {
                method: "GET",
                headers: {
                    "x-freepik-api-key": FREEPIK_API_KEY!,
                },
            }
        );

        if (!statusResponse.ok) {
            const errorText = await statusResponse.text();
            console.error(`Status check failed: ${statusResponse.status} for task ${taskId}`, errorText);
            return NextResponse.json(
                { error: `Task not found or access denied: ${statusResponse.status}` },
                { status: statusResponse.status }
            );
        }

        const statusData = await statusResponse.json();
        console.log("Freepik Video Status response:", statusData);
        
        // Map the response to consistent format
        return NextResponse.json({
            taskId: taskId,
            status: statusData.data?.status?.toLowerCase(), // Normalize to lowercase
            output: statusData.data?.generated, // Use 'generated' field from response
            error: statusData.data?.error
        }, { status: 200 });

    } catch (error) {
        console.error("Error checking task status:", error);
        return NextResponse.json(
            { error: "Failed to check task status" }, 
            { status: 500 }
        );
    }
}