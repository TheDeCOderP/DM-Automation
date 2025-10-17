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