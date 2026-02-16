import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/upload";
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
        // Get authenticated user
        const { getToken } = await import("next-auth/jwt");
        const token = await getToken({ req });
        
        if (!token?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has access to this brand and their role
        const userBrand = await prisma.userBrand.findFirst({
            where: {
                userId: token.id,
                brandId: id as string,
            },
            include: {
                role: true,
            }
        });

        if (!userBrand) {
            return NextResponse.json(
                { error: "You don't have access to this brand" },
                { status: 403 }
            );
        }

        // Check if user has permission to edit (BrandAdmin or BrandEditor)
        const canEdit = userBrand.role?.name === "BrandAdmin" || userBrand.role?.name === "BrandEditor";
        
        if (!canEdit) {
            return NextResponse.json(
                { error: "You don't have permission to edit this brand. Only Brand Admins and Editors can edit brand details." },
                { status: 403 }
            );
        }

        const formData = await req.formData()
        const name = formData.get('name') as string;
        const file = formData.get('logo') as File | null;
        const website = formData.get('website') as string;
        const description = formData.get('description') as string;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required." },
                { status: 400 }
            );
        }

        // Check if another brand with the same name exists (excluding current brand)
        const existingBrand = await prisma.brand.findFirst({
            where: {
                name: {
                    equals: name,
                    
                },
                NOT: {
                    id: id as string
                }
            }
        });

        if (existingBrand) {
            return NextResponse.json(
                { error: `Brand name "${name}" already exists. Please choose a different name.` },
                { status: 400 }
            );
        }

        let logoUrl = null;
        if (file) {
            // Upload to Local CDN (with Cloudinary fallback)
            logoUrl = await uploadFile(file, 'brand-logos');
        }

        const brand = await prisma.brand.update({
            where: {
                id: id as string,
            },
            data: {
                name,
                website,
                description,
                ...(logoUrl && { logo: logoUrl }),
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
        // Get authenticated user
        const { getToken } = await import("next-auth/jwt");
        const token = await getToken({ req });
        
        if (!token?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user has access to this brand and their role
        const userBrand = await prisma.userBrand.findFirst({
            where: {
                userId: token.id,
                brandId: id as string,
            },
            include: {
                role: true,
            }
        });

        if (!userBrand) {
            return NextResponse.json(
                { error: "You don't have access to this brand" },
                { status: 403 }
            );
        }

        // Only BrandAdmin can delete brand
        if (userBrand.role?.name !== "BrandAdmin") {
            return NextResponse.json(
                { error: "Only Brand Admins can delete brands" },
                { status: 403 }
            );
        }

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