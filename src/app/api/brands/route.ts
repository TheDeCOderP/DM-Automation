import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { uploadFile } from "@/lib/upload";
import { NextRequest, NextResponse } from "next/server";
import { UploadApiResponse } from "cloudinary";

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const userBrands = await prisma.userBrand.findMany({
            where: {
                userId: token.id
            },
            include: {
                brand: {
                    include: {
                        socialAccounts: {
                            where: {
                                connectedByUserId: token.id, // Only show accounts connected by this user
                                socialAccount: {
                                    platform: {
                                        not: {
                                            in: ["ZOHO_WORKDRIVE", "GOOGLE"]
                                        }
                                    }
                                },
                            },
                            include: {
                                connectedBy: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                },
                                socialAccount: {
                                    include: {
                                        pages: true
                                    }
                                }
                            }
                        },
                        // Include members to show role information
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                    }
                                },
                                role: {
                                    select: {
                                        name: true,
                                    }
                                },
                            }
                        },
                        brandInvitations: {
                            where: {
                                status: {
                                    in: ["PENDING", "REJECTED"]
                                }
                            },
                            include: {
                                invitedTo: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        image: true,
                                    }
                                }
                            }
                        }
                    }
                },
                role: true, // Include user's role for each brand
            },
        });

        // Transform the data to include role and members information
        const brands = userBrands.map((ub: any) => {
            console.log('DEBUG - Role info:', {
                roleId: ub.roleId,
                roleName: ub.role?.name,
                roleObject: ub.role,
                isAdmin: ub.role?.name === "BrandAdmin"
            });
            
            return {
                ...ub.brand,
                // Flatten the socialAccounts structure
                socialAccounts: ub.brand.socialAccounts.map((sa: any) => ({
                    ...sa.socialAccount,
                    connectedBy: sa.connectedBy // Add who connected this account
                })),
                // Include user's role for this specific brand
                userRole: ub.role?.name,
                isAdmin: ub.role?.name === "BrandAdmin",
                // Include all members (users who have access to this brand)
                members: ub.brand.members.map((member: any) => ({
                    id: member.user.id,
                    name: member.user.name,
                    email: member.user.email,
                    image: member.user.image,
                    role: member.role?.name,
                    // Add isCurrentUser flag to identify the current user
                    isCurrentUser: member.user.id === token.id
                }))
            };
        });

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
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData()
        const file = formData.get('logo') as File | null
        const name = formData.get('name') as string
        const description = formData.get('description') as string
        const website = formData.get('website') as string

        // Check if brand name already exists
        const existingBrand = await prisma.brand.findFirst({
            where: {
                name: {
                    equals: name,
                    
                }
            }
        });

        if (existingBrand) {
            return NextResponse.json(
                { error: `Brand name "${name}" already exists. Please choose a different name.` },
                { status: 400 }
            );
        }

        let logoUrl = null
        if (file) {
            // Upload to Local CDN (with Cloudinary fallback)
            logoUrl = await uploadFile(file, 'brand-logos');
        }

        const brand = await prisma.brand.create({
            data: {
                name,
                description,
                website,
                logo: logoUrl,
            },
        });

        // Find the BrandAdmin role dynamically to ensure correct assignment
        const brandAdminRole = await prisma.role.findFirst({
            where: { name: "BrandAdmin" }
        });

        if (!brandAdminRole) {
            return NextResponse.json(
                { error: "BrandAdmin role not found. Please run database seed." },
                { status: 500 }
            );
        }

        await prisma.userBrand.create({
            data: {
                userId: token.id,
                brandId: brand.id,
                roleId: brandAdminRole.id, // BrandAdmin role (dynamically fetched)
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
