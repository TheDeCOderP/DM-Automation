import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
	const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const data = await req.json();
    
    try {
        const post = await prisma.post.findUnique({
            where: {
                id: data.id,
            },
        });

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json(
            { error: `Error fetching the post with ID ${data.id}` },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
	const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const data = await req.json();
    
    try {
        const post = await prisma.post.update({
            where: {
                id: data.id,
            },
            data,
        });

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("Error updating post:", error);
        return NextResponse.json(
            { error: `Error updating the post with ID ${data.id}` },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    const data = await req.json();
    
    try {
        const post = await prisma.post.delete({
            where: {
                id: data.id,
            },
        });

        return NextResponse.json({ post }, { status: 200 });
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json(
            { error: `Error deleting the post with ID ${data.id}` },
            { status: 500 }
        );
    }
}