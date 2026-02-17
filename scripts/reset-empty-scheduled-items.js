const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetEmptyScheduledItems() {
  try {
    console.log('=== Resetting Empty Scheduled Calendar Items ===\n');

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
      },
    });

    console.log(`Found ${scheduledItems.length} scheduled calendar items\n`);

    let resetCount = 0;

    for (const item of scheduledItems) {
      const postCount = item.postGroup?.posts.length || 0;
      
      console.log(`Calendar Item: Day ${item.day} - ${item.topic}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Status: ${item.status}`);
      console.log(`  Posts in group: ${postCount}`);

      if (postCount === 0) {
        console.log(`  ⚠️  No posts found! Resetting to EDITED status...`);
        
        // Reset the calendar item status
        await prisma.contentCalendarItem.update({
          where: { id: item.id },
          data: {
            status: 'EDITED',
            postGroupId: null, // Unlink the empty post group
          },
        });

        // Delete the empty post group
        if (item.postGroupId) {
          await prisma.postGroup.delete({
            where: { id: item.postGroupId },
          });
          console.log(`  ✓ Deleted empty post group ${item.postGroupId}`);
        }

        console.log(`  ✓ Reset calendar item to EDITED status`);
        resetCount++;
      } else {
        console.log(`  ✓ Has posts, keeping SCHEDULED status`);
      }
      
      console.log('');
    }

    console.log(`\n=== Summary ===`);
    console.log(`Reset ${resetCount} calendar items back to EDITED status`);
    
    // Get updated counts
    const counts = await prisma.contentCalendarItem.groupBy({
      by: ['status'],
      _count: true,
    });

    console.log('\nUpdated Calendar Item Status Counts:');
    counts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count}`);
    });

  } catch (error) {
    console.error('Error resetting calendar items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetEmptyScheduledItems();
