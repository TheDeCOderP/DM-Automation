import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if(!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const users = await prisma.user.findMany({
            where: { id: { not: token.id }},
            select: {
                id: true,
                name: true,
                email: true,
            },
        });
        
        return NextResponse.json({ users }, { status: 200 });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}