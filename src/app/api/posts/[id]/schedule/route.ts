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
    const body = await req.json();
    const { scheduledAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Post ID required" },
        { status: 400 }
      );
    }

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "Schedule time required" },
        { status: 400 }
      );
    }

    const scheduleDate = new Date(scheduledAt);
    const now = new Date();

    if (scheduleDate <= now) {
      return NextResponse.json(
        { error: "Schedule time must be in the future" },
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

    // Check if post can be scheduled
    if (post.status !== "DRAFTED" && post.status !== "FAILED") {
      return NextResponse.json(
        { error: "Only drafted or failed posts can be scheduled" },
        { status: 400 }
      );
    }

    // Update post to scheduled
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: scheduleDate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(
      {
        message: "Post scheduled successfully",
        post: updatedPost,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error scheduling post:", error);
    return NextResponse.json(
      { error: "Failed to schedule post" },
      { status: 500 }
    );
  }
}
