const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPastScheduledPosts() {
  try {
    console.log('=== Checking Past Scheduled Posts ===\n');
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Find all posts that are scheduled but the time has passed
    const pastScheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now, // Posts scheduled for now or earlier
        },
      },
      include: {
        media: true,
        brand: true,
        socialAccountPage: true,
        socialAccount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    console.log(`Found ${pastScheduledPosts.length} posts that should have been published:\n`);

    if (pastScheduledPosts.length === 0) {
      console.log('✓ No overdue posts found. All scheduled posts are in the future or have been published.');
    } else {
      pastScheduledPosts.forEach((post, index) => {
        console.log(`--- Post ${index + 1} ---`);
        console.log(`ID: ${post.id}`);
        console.log(`Title: ${post.title || 'N/A'}`);
        console.log(`Platform: ${post.platform}`);
        console.log(`Status: ${post.status}`);
        console.log(`Scheduled At: ${post.scheduledAt?.toISOString()}`);
        
        const minutesOverdue = Math.floor((now.getTime() - post.scheduledAt.getTime()) / 1000 / 60);
        console.log(`⚠️  OVERDUE by ${minutesOverdue} minutes`);
        
        console.log(`Brand: ${post.brand?.name || 'N/A'}`);
        console.log(`User: ${post.user?.name || 'N/A'}`);
        console.log(`Social Account ID: ${post.socialAccountId || 'N/A'}`);
        console.log(`Social Account Page ID: ${post.socialAccountPageId || 'N/A'}`);
        console.log(`Post Group ID: ${post.postGroupId || 'N/A'}`);
        console.log(`Media: ${post.media.length} items`);
        console.log(`Content preview: ${post.content.substring(0, 100)}...`);
        console.log('');
      });

      console.log('\n=== Recommendation ===');
      console.log('These posts should have been published by the cron job.');
      console.log('Possible issues:');
      console.log('1. Cron job is not running at the scheduled time');
      console.log('2. Cron job authentication is failing');
      console.log('3. Cron job is not configured correctly');
      console.log('4. There was an error during publishing that was not logged');
      console.log('\nYou can manually trigger publishing by calling:');
      console.log('POST /api/cron-jobs/publish-post');
      console.log('With header: Authorization: Bearer <CRON_SECRET_TOKEN>');
    }

    // Check all scheduled posts (including future ones)
    console.log('\n=== All Scheduled Posts ===\n');
    const allScheduled = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
      },
      select: {
        id: true,
        title: true,
        platform: true,
        scheduledAt: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    console.log(`Total scheduled posts: ${allScheduled.length}\n`);
    allScheduled.forEach((post, idx) => {
      const isPast = post.scheduledAt && post.scheduledAt <= now;
      const status = isPast ? '⚠️  PAST' : '⏰ FUTURE';
      console.log(`${idx + 1}. ${status} - ${post.platform} - ${post.scheduledAt?.toISOString()} - ${post.title || 'Untitled'}`);
    });

  } catch (error) {
    console.error('Error checking past scheduled posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPastScheduledPosts();
