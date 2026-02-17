const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixCalendarItemStatus() {
  try {
    console.log('=== Fixing Calendar Item Status ===\n');

    // Find all calendar items with status SCHEDULED
    const scheduledItems = await prisma.contentCalendarItem.findMany({
      where: {
        status: 'SCHEDULED',
      },
      include: {
        postGroup: {
          include: {
            posts: true,
          },
        },
        calendar: {
          select: {
            topic: true,
          },
        },
      },
    });

    console.log(`Found ${scheduledItems.length} scheduled calendar items\n`);

    for (const item of scheduledItems) {
      console.log(`--- Calendar Item: Day ${item.day} ---`);
      console.log(`ID: ${item.id}`);
      console.log(`Topic: ${item.topic}`);
      console.log(`Calendar: ${item.calendar.topic}`);
      console.log(`Status: ${item.status}`);
      console.log(`Suggested Time: ${item.suggestedTime?.toISOString() || 'N/A'}`);
      console.log(`Post Group ID: ${item.postGroupId || 'N/A'}`);

      if (item.postGroup) {
        console.log(`\nPosts in group (${item.postGroup.posts.length}):`);
        
        item.postGroup.posts.forEach((post, idx) => {
          console.log(`  ${idx + 1}. Platform: ${post.platform}, Status: ${post.status}, Scheduled: ${post.scheduledAt?.toISOString()}`);
        });

        // Check if all posts are published
        const allPublished = item.postGroup.posts.every(p => p.status === 'PUBLISHED');
        const anyPublished = item.postGroup.posts.some(p => p.status === 'PUBLISHED');

        if (allPublished && item.postGroup.posts.length > 0) {
          console.log(`\n✅ All posts are PUBLISHED. Updating calendar item to PUBLISHED...`);
          
          await prisma.contentCalendarItem.update({
            where: { id: item.id },
            data: { status: 'PUBLISHED' },
          });
          
          console.log(`✓ Updated calendar item ${item.id} to PUBLISHED`);
        } else if (anyPublished) {
          console.log(`\n⚠️  Some posts are published, but not all`);
        } else {
          console.log(`\n⏳ No posts have been published yet`);
        }
      } else {
        console.log(`\n⚠️  No post group found for this calendar item`);
      }

      console.log('');
    }

    console.log('\n=== Summary ===');
    
    // Get updated counts
    const counts = await prisma.contentCalendarItem.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('\nCalendar Item Status Counts:');
    counts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count}`);
    });

  } catch (error) {
    console.error('Error fixing calendar item status:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixCalendarItemStatus();
