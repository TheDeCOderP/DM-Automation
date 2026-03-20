import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getToken } from "next-auth/jwt";

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all scheduled posts that have platformMetadata with hashtags
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: "SCHEDULED",
        NOT: { platformMetadata: { equals: Prisma.JsonNull } },
      },
      select: {
        id: true,
        content: true,
        platformMetadata: true,
      },
    });

    let updated = 0;
    let skipped = 0;

    for (const post of scheduledPosts) {
      const meta = post.platformMetadata as { hashtags?: string[] } | null;
      const hashtags = meta?.hashtags;

      if (!hashtags || hashtags.length === 0) {
        skipped++;
        continue;
      }

      const hashtagString = hashtags
        .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
        .join(" ");

      // Skip if hashtags are already in the content
      if (post.content.includes(hashtagString) || hashtags.every((h) => post.content.includes(h))) {
        skipped++;
        continue;
      }

      await prisma.post.update({
        where: { id: post.id },
        data: {
          content: `${post.content}\n\n${hashtagString}`,
        },
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      message: `Done. Updated ${updated} posts, skipped ${skipped} (already had hashtags or none to add).`,
      updated,
      skipped,
      total: scheduledPosts.length,
    });
  } catch (error) {
    console.error("Error fixing scheduled post hashtags:", error);
    return NextResponse.json({ error: `Failed: ${error}` }, { status: 500 });
  }
}
