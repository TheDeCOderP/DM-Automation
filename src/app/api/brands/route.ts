import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import cloudinary from "@/lib/cloudinary";
import { NextRequest, NextResponse } from "next/server";
import { UploadApiResponse } from "cloudinary";

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const userBrands = await prisma.userBrand.findMany({
            where: {
                userId: token.id
            },
            include: {
                brand: {
                    include: {
                        // Correct way to include social accounts through the junction table
                        socialAccounts: {
                            where: {
                                socialAccount: {
                                    platform: {
                                        not: {
                                            in: ["ZOHO_WORKDRIVE", "GOOGLE"]
                                        }
                                    }
                                },
                            },
                            include: {
                                socialAccount: {
                                    include: {
                                        // Include page tokens if needed
                                        pageTokens: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        // Transform the data to make it more usable
        const brands = userBrands.map(ub => ({
            ...ub.brand,
            // Flatten the socialAccounts structure
            socialAccounts: ub.brand.socialAccounts.map(sa => ({
                ...sa.socialAccount,
                // You can add any additional fields from the junction table here
            }))
        }));

        return NextResponse.json({ data: brands }, { status: 200 });
    } catch (error) {
        console.error("Error fetching brands:", error);
        return NextResponse.json(
            { error: `Error fetching brands: ${error}` },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const formData = await req.formData()
        const file = formData.get('logo') as File | null
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const website = formData.get('website') as string

        let logoUrl = null
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

        const brand = await prisma.brand.create({
            data: {
                name,
                description,
                website,
                logo: logoUrl,
            },
        });

        await prisma.userBrand.create({
            data: {
                userId: token.id,
                brandId: brand.id,
            },
        });

        return NextResponse.json({ brand }, { status: 200 });
    } catch (error) {
        console.error("Error adding brand:", error);
        return NextResponse.json(
            { error: `Error adding brand: ${error}` },
            { status: 500 }
        );
    }
}
