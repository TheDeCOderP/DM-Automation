import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const token = await getToken({ req });
    if(!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { id } = await context.params;

        const users = await prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: token.id } },
                    {
                    acceptedBrandInvitations: {
                        none: {
                        brandId: id,
                        expiresAt: { gt: new Date() },
                        status: { in: ["PENDING", "ACCEPTED"] },
                        },
                    },
                    },
                ],
            }

        });
        
        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}