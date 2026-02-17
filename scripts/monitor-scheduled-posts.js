const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function monitorScheduledPosts() {
  try {
    console.log('=== Scheduled Posts Monitor ===\n');
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Get all scheduled posts
    const allScheduled = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
      },
      include: {
        brand: {
          select: { name: true },
        },
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    console.log(`Total scheduled posts: ${allScheduled.length}\n`);

    if (allScheduled.length === 0) {
      console.log('✓ No scheduled posts found.\n');
    } else {
      const overdue = [];
      const upcoming = [];

      allScheduled.forEach((post) => {
        if (post.scheduledAt && post.scheduledAt <= now) {
          overdue.push(post);
        } else {
          upcoming.push(post);
        }
      });

      if (overdue.length > 0) {
        console.log(`⚠️  OVERDUE POSTS: ${overdue.length}\n`);
        overdue.forEach((post, idx) => {
          const minutesOverdue = Math.floor((now.getTime() - post.scheduledAt.getTime()) / 1000 / 60);
          console.log(`${idx + 1}. Post ID: ${post.id}`);
          console.log(`   Platform: ${post.platform}`);
          console.log(`   Title: ${post.title || 'Untitled'}`);
          console.log(`   Scheduled: ${post.scheduledAt.toISOString()}`);
          console.log(`   ⚠️  OVERDUE by ${minutesOverdue} minutes`);
          console.log(`   Brand: ${post.brand?.name || 'N/A'}`);
          console.log(`   User: ${post.user?.name || 'N/A'} (${post.user?.email || 'N/A'})`);
          console.log('');
        });

        console.log('🔧 ACTION REQUIRED:');
        console.log('Run: node scripts/test-publish-overdue.js');
        console.log('Or call: POST /api/posts/publish-overdue\n');
      } else {
        console.log('✓ No overdue posts\n');
      }

      if (upcoming.length > 0) {
        console.log(`📅 UPCOMING POSTS: ${upcoming.length}\n`);
        upcoming.slice(0, 5).forEach((post, idx) => {
          const minutesUntil = Math.floor((post.scheduledAt.getTime() - now.getTime()) / 1000 / 60);
          const hoursUntil = Math.floor(minutesUntil / 60);
          const timeStr = hoursUntil > 0 
            ? `${hoursUntil}h ${minutesUntil % 60}m` 
            : `${minutesUntil}m`;
          
          console.log(`${idx + 1}. ${post.platform} - in ${timeStr} - ${post.title || 'Untitled'}`);
          console.log(`   Scheduled: ${post.scheduledAt.toISOString()}`);
        });
        
        if (upcoming.length > 5) {
          console.log(`   ... and ${upcoming.length - 5} more`);
        }
        console.log('');
      }
    }

    // Check calendar items
    console.log('=== Calendar Items Status ===\n');
    const calendarItems = await prisma.contentCalendarItem.groupBy({
      by: ['status'],
      _count: true,
    });

    if (calendarItems.length > 0) {
      calendarItems.forEach(({ status, _count }) => {
        console.log(`  ${status}: ${_count}`);
      });
    } else {
      console.log('  No calendar items found');
    }

    // Check for scheduled calendar items without posts
    console.log('\n=== Checking Calendar Items Integrity ===\n');
    const scheduledCalendarItems = await prisma.contentCalendarItem.findMany({
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

    const brokenItems = scheduledCalendarItems.filter(
      item => !item.postGroup || item.postGroup.posts.length === 0
    );

    if (brokenItems.length > 0) {
      console.log(`⚠️  Found ${brokenItems.length} scheduled calendar items with no posts:`);
      brokenItems.forEach((item, idx) => {
        console.log(`  ${idx + 1}. Day ${item.day} - ${item.topic}`);
        console.log(`     Suggested Time: ${item.suggestedTime?.toISOString() || 'N/A'}`);
      });
      console.log('\n🔧 ACTION: Run node scripts/reset-empty-scheduled-items.js to fix\n');
    } else {
      console.log('✓ All scheduled calendar items have posts\n');
    }

  } catch (error) {
    console.error('Error monitoring scheduled posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

monitorScheduledPosts();
