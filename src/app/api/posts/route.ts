import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { NextResponse, NextRequest } from "next/server";

import { MediaType, Status, Frequency, Platform } from "@prisma/client";

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const posts = await prisma.post.findMany({
            where: {
                userId: token.id,
            },
        });

        if(!posts){
            throw new Error("No posts found");
        }

        return NextResponse.json({ posts }, { status: 200 });      
    } catch (error) {
        console.log("Error fetching posts:", error);
        return NextResponse.json(
            { error: `Error fetching posts ${error}`},
            {status: 500}
        );
    }
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const formData = await req.formData();
        
        // Parse JSON data from FormData
        const captions = JSON.parse(formData.get('captions') as string);
        const schedule = JSON.parse(formData.get('schedule') as string);
        const accounts = JSON.parse(formData.get('accounts') as string);
        
        // Get files from FormData
        const files = formData.getAll('files') as File[];
        
        // Upload media files first
        const mediaUrls: { url: string; type: MediaType }[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                // Convert File to buffer for Cloudinary upload
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                
                // Upload to Cloudinary using buffer
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            resource_type: "auto", // Let Cloudinary detect the type
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(buffer);
                });
                
                mediaUrls.push({
                    url: (uploadResult as any).secure_url,
                    type: (uploadResult as any).resource_type.toUpperCase() as MediaType
                });
            }
        }

        // Create posts for each platform with caption
        const createdPosts = [];
        for (const platform in captions) {
            const caption = captions[platform as Platform];
            if (!caption) continue; // Skip if no caption for this platform

            const post = await prisma.post.create({
                data: {
                    content: caption,
                    caption: caption,
                    platform: platform as Platform,
                    scheduledAt: new Date(schedule.startDate),
                    status: Status.SCHEDULED,
                    userId: token.id,
                    frequency: schedule.frequency.toUpperCase() as Frequency,
                },
            });

            // Attach media to each post
            if (mediaUrls.length > 0) {
                for (const media of mediaUrls) {
                    await prisma.media.create({
                        data: {
                            postId: post.id,
                            userId: token.id,
                            url: media.url,
                            type: media.type,
                        },
                    });
                }
            }

            createdPosts.push(post);
        }

        return NextResponse.json({ posts: createdPosts }, { status: 201 });
    } catch (error) {
        console.log("Error creating post:", error);
        return NextResponse.json(
            { error: `Error creating post ${error}`},
            {status: 500}
        );
    }
}

export async function DELETE(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const data = await req.json();
        const post = await prisma.post.delete({
            where: {
                id: data.id,
            },
        });

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.log("Error deleting post:", error);
        return NextResponse.json(
            { error: `Error deleting post ${error}`},
            {status: 500}
        );
    }
}

export async function PUT(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const data = await req.json();
        const post = await prisma.post.update({
            where: {
                id: data.id,
            },
            data,
        });

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.log("Error updating post:", error);
        return NextResponse.json(
            { error: `Error updating post ${error}`},
            {status: 500}
        );
    }
}