import { prisma } from "@/lib/prisma";

/**
 * Updates the calendar item status to PUBLISHED if all posts in the post group are published
 * @param postId - The ID of the post that was just published
 */
export async function updateCalendarItemStatus(postId: string) {
  try {
    // Get the post with its metadata
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        platformMetadata: true,
        postGroupId: true,
      },
    });

    if (!post || !post.postGroupId) {
      return;
    }

    // Extract calendarItemId from metadata
    const metadata = post.platformMetadata as any;
    const calendarItemId = metadata?.calendarItemId;
    
    if (!calendarItemId) {
      return;
    }

    // Check if all posts in the post group are published
    const postGroup = await prisma.postGroup.findUnique({
      where: { id: post.postGroupId },
      include: { posts: true },
    });

    if (!postGroup) {
      return;
    }

    const allPublished = postGroup.posts.every(p => p.status === 'PUBLISHED');

    if (allPublished) {
      await prisma.contentCalendarItem.update({
        where: { id: calendarItemId },
        data: { status: 'PUBLISHED' },
      });
      console.log(`[CALENDAR] Updated calendar item ${calendarItemId} to PUBLISHED`);
    }
  } catch (error) {
    console.error('[CALENDAR] Error updating calendar item status:', error);
    // Don't throw - this is a non-critical operation
  }
}
