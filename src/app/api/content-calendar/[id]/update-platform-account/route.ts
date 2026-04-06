import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, Status, Frequency } from "@prisma/client";

interface Selection {
  socialAccountId: string;
  socialAccountPageId: string | null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: calendarId } = await params;
    const body = await req.json();
    const { platform, selections }: { platform: string; selections: Selection[] } = body;

    if (!platform || !selections || selections.length === 0) {
      return NextResponse.json(
        { error: "platform and selections are required" },
        { status: 400 }
      );
    }

    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    const userBrand = await prisma.userBrand.findFirst({
      where: { userId: token.id, brandId: calendar.brandId },
    });

    if (!userBrand) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all calendar items that have scheduled posts for this platform
    const items = await prisma.contentCalendarItem.findMany({
      where: { calendarId },
      include: {
        postGroup: {
          include: {
            posts: {
              where: { platform: platform as Platform },
            },
          },
        },
      },
    });

    const itemsWithPosts = items.filter(
      (item) => item.postGroup && item.postGroup.posts.length > 0
    );

    if (itemsWithPosts.length === 0) {
      return NextResponse.json(
        { error: "No scheduled posts found for this platform" },
        { status: 404 }
      );
    }

    let totalCreated = 0;

    for (const item of itemsWithPosts) {
      const existingPost = item.postGroup!.posts[0]; // use first post as template
      const postGroupId = item.postGroup!.id;

      // Delete all existing posts for this platform in this postGroup
      await prisma.post.deleteMany({
        where: { postGroupId, platform: platform as Platform },
      });

      // Re-create one post per selection
      for (const sel of selections) {
        await prisma.post.create({
          data: {
            title: existingPost.title,
            content: existingPost.content,
            platform: platform as Platform,
            scheduledAt: existingPost.scheduledAt,
            status: Status.SCHEDULED,
            frequency: Frequency.ONCE,
            url: null,
            userId: token.id,
            brandId: calendar.brandId,
            socialAccountId: sel.socialAccountId,
            socialAccountPageId: sel.socialAccountPageId,
            postGroupId,
            platformMetadata: existingPost.platformMetadata ?? undefined,
          },
        });
        totalCreated++;
      }
    }

    return NextResponse.json({ success: true, updated: itemsWithPosts.length, created: totalCreated });
  } catch (error) {
    console.error("Error updating platform account:", error);
    return NextResponse.json(
      { error: "Failed to update platform account" },
      { status: 500 }
    );
  }
}
