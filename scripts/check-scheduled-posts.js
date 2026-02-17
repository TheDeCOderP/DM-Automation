const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkScheduledPosts() {
  try {
    console.log('=== Checking Scheduled Posts ===\n');
    
    const now = new Date();
    console.log(`Current time: ${now.toISOString()}\n`);

    // Find the specific post scheduled for 2/17/2026, 1:35:00 AM
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
      },
      include: {
        media: true,
        brand: true,
        socialAccountPage: true,
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

    console.log(`Found ${scheduledPosts.length} scheduled posts:\n`);

    scheduledPosts.forEach((post, index) => {
      console.log(`--- Post ${index + 1} ---`);
      console.log(`ID: ${post.id}`);
      console.log(`Topic: ${post.topic || 'N/A'}`);
      console.log(`Platform: ${post.platform}`);
      console.log(`Status: ${post.status}`);
      console.log(`Scheduled At: ${post.scheduledAt?.toISOString() || 'N/A'}`);
      console.log(`Published At: ${post.publishedAt?.toISOString() || 'N/A'}`);
      console.log(`Created At: ${post.createdAt.toISOString()}`);
      console.log(`Updated At: ${post.updatedAt.toISOString()}`);
      console.log(`User: ${post.user?.name || 'N/A'} (${post.user?.email || 'N/A'})`);
      console.log(`Brand: ${post.brand?.name || 'N/A'}`);
      console.log(`Social Account Page ID: ${post.socialAccountPageId || 'N/A'}`);
      
      // Check if this post should have been published
      if (post.scheduledAt && post.scheduledAt <= now) {
        console.log(`⚠️  This post should have been published! (scheduled time has passed)`);
      } else if (post.scheduledAt) {
        const timeUntil = post.scheduledAt.getTime() - now.getTime();
        const minutesUntil = Math.floor(timeUntil / 1000 / 60);
        console.log(`⏰ Time until scheduled: ${minutesUntil} minutes`);
      }
      console.log('');
    });

    // Check for posts that should be published now
    const postsToPublish = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          lte: now,
        },
      },
    });

    console.log(`\n=== Posts that should be published now: ${postsToPublish.length} ===\n`);
    
    if (postsToPublish.length > 0) {
      postsToPublish.forEach((post) => {
        console.log(`- Post ID: ${post.id}, Topic: ${post.topic}, Scheduled: ${post.scheduledAt?.toISOString()}`);
      });
    }

    // Check recent notifications
    console.log('\n=== Recent Notifications ===\n');
    const recentNotifications = await prisma.notification.findMany({
      where: {
        type: {
          in: ['POST_PUBLISHED', 'POST_FAILED'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    recentNotifications.forEach((notif) => {
      console.log(`- ${notif.type}: ${notif.title} (${notif.createdAt.toISOString()})`);
      console.log(`  Message: ${notif.message}`);
      if (notif.metadata) {
        console.log(`  Metadata:`, notif.metadata);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error checking scheduled posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScheduledPosts();
