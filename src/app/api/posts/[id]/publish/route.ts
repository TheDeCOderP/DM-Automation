import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID required" },
        { status: 400 }
      );
    }

    // Get the post
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        brand: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user has access to this brand
    const hasAccess = post.brand.members.some(
      (member) => member.userId === token.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    // Check if post can be published
    if (post.status !== "DRAFTED" && post.status !== "FAILED") {
      return NextResponse.json(
        { error: "Only drafted or failed posts can be published" },
        { status: 400 }
      );
    }

    // Update post to scheduled for immediate publishing
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: new Date(), // Immediate
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Post queued for publishing",
        post: updatedPost,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error publishing post:", error);
    return NextResponse.json(
      { error: "Failed to publish post" },
      { status: 500 }
    );
  }
}
