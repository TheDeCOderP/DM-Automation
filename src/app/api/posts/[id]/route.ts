import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { fetchTwitterPostAnalytics } from "@/services/twitter.service";
import { fetchLinkedInPostAnalytics } from "@/services/linkedin.service";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        brand: true,
        socialAccountPage: true,
        media: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let analytics = null;

    switch (post.platform) {
      case "FACEBOOK":
        if (post.socialAccountPage?.accessToken && post.socialAccountPage?.pageId) {
          //analytics = await fetchFacebookAnalytics(post.socialAccountPage.pageId, post.url, post.socialAccountPage.accessToken);
        }
        break;
      case "TWITTER":
        analytics = await fetchTwitterPostAnalytics(post);
        break;
      case "LINKEDIN":
        analytics = await fetchLinkedInPostAnalytics(post);
        break;
      default:
        analytics = { message: "Analytics not available for this platform" };
    }

    return NextResponse.json(
      { post, analytics },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error fetching post analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch post analytics" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const data = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    // Get the post to check access
    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: {
        brand: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user has access to this brand
    const hasAccess = existingPost.brand.members.some(
      (member) => member.userId === token.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    // Only allow editing drafted or failed posts
    if (existingPost.status !== "DRAFTED" && existingPost.status !== "FAILED") {
      return NextResponse.json(
        { error: "Only drafted or failed posts can be edited" },
        { status: 400 }
      );
    }

    // Update the post
    const post = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        content: data.content,
        platform: data.platform,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : existingPost.scheduledAt,
        updatedAt: new Date(),
      },
      include: {
        brand: true,
        socialAccountPage: {
          include: {
            socialAccount: true,
          },
        },
        media: true,
        user: true,
      },
    });

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Error updating the post" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }

    // Get the post to check access
    const existingPost = await prisma.post.findUnique({
      where: { id },
      include: {
        brand: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!existingPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user has access to this brand
    const hasAccess = existingPost.brand.members.some(
      (member) => member.userId === token.id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    // Delete the post
    const post = await prisma.post.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: "Post deleted successfully", post },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Error deleting the post" },
      { status: 500 }
    );
  }
}