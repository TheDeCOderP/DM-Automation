import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id: brandId } = await context.params;

        // Only brand admins may see who can be invited
        const membership = await prisma.userBrand.findUnique({
            where: { userId_brandId: { userId: token.id, brandId } },
            include: { role: true },
        });

        if (!membership || membership.role.name !== "BrandAdmin") {
            return NextResponse.json({ error: "Only brand admins can view invite candidates" }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: token.id } },
                    {
                        acceptedBrandInvitations: {
                            none: {
                                brandId,
                                expiresAt: { gt: new Date() },
                                status: { in: ["PENDING", "ACCEPTED"] },
                            },
                        },
                    },
                ],
            },
        });

        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
