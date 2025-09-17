import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import type { UploadApiResponse } from 'cloudinary';
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
    }

    try {
        const brand = await prisma.brand.findUnique({
            where: {
                id: id as string,
            },
        });
        return NextResponse.json({ brand }, { status: 200 });
    } catch (error) {
        console.error("Error fetching brand:", error);
        return NextResponse.json({ error: "Error fetching the brand" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
    }

    try {
        const formData = await req.formData()
        const name = formData.get('name') as string;
        const file = formData.get('logo') as File | null;
        const website = formData.get('website') as string;
        const description = formData.get('description') as string;

        if (!name) {
            return NextResponse.json(
                { error: "Name and Website are required fields." },
                { status: 400 }
            );
        }

        let logoUrl = null;
        if (file) {
            // Convert file to buffer
            const bytes = await file.arrayBuffer()
            const buffer = Buffer.from(bytes)
            
            // Upload to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary.uploader
                .upload_stream(
                    {
                    resource_type: "auto",
                    },
                    (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                    },
                )
                .end(buffer)
            });
            logoUrl = (uploadResult as UploadApiResponse).secure_url
        }

        const brand = await prisma.brand.update({
            where: {
                id: id as string,
            },
            data: {
                name,
                website,
                description,
                logo: logoUrl,
                updatedAt: new Date(),
            },
        });
        return NextResponse.json({ brand }, { status: 200 });
    } catch (error) {
        console.error("Error updating brand:", error);
        return NextResponse.json({ error: "Error updating the brand" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!id) {
        return NextResponse.json({ error: "Brand ID is required" }, { status: 400 });
    }

    try {
        const brand = await prisma.brand.findUnique({
            where: {
                id: id as string,
            },
        });

        if(!brand) {
            return NextResponse.json({ error: "Brand not found" }, { status: 404 });
        }

        await prisma.brand.delete({
            where: {
                id: id as string,
            }
        });

        return NextResponse.json({ message: "Brand deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting brand:", error);
        return NextResponse.json({ error: "Failed to delete brand" }, { status: 500 });
    }
}