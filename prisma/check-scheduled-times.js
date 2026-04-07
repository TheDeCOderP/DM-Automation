const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkScheduledTimes() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING SCHEDULED POSTS AND TIMEZONE ISSUES');
    console.log('='.repeat(80));
    console.log();

    // Get current time in different timezones
    const now = new Date();
    console.log('Current Server Time (UTC):', now.toISOString());
    console.log('Current Server Time (Local):', now.toString());
    console.log();

    // UK Time (GMT/BST)
    const ukTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/London' }));
    console.log('UK Time (Europe/London):', ukTime.toString());
    
    // India Time (IST)
    const indiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    console.log('India Time (Asia/Kolkata):', indiaTime.toString());
    console.log();
    console.log('='.repeat(80));
    console.log();

    // Fetch all scheduled posts
    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        brand: {
          select: {
            name: true
          }
        },
        socialAccount: {
          select: {
            platform: true,
            platformUsername: true
          }
        }
      },
      orderBy: {
        scheduledAt: 'asc'
      }
    });

    console.log(`Found ${scheduledPosts.length} scheduled posts\n`);

    if (scheduledPosts.length === 0) {
      console.log('No scheduled posts found in the database.');
      return;
    }

    scheduledPosts.forEach((post, index) => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`POST #${index + 1}`);
      console.log(`${'='.repeat(80)}`);
      console.log(`ID: ${post.id}`);
      console.log(`Title: ${post.title || 'N/A'}`);
      console.log(`Content: ${post.content.substring(0, 100)}...`);
      console.log(`Platform: ${post.platform}`);
      console.log(`Brand: ${post.brand.name}`);
      console.log(`User: ${post.user.name} (${post.user.email})`);
      console.log(`Status: ${post.status}`);
      console.log(`Frequency: ${post.frequency || 'N/A'}`);
      
      if (post.scheduledAt) {
        const scheduledDate = new Date(post.scheduledAt);
        console.log(`\nScheduled Time (Stored in DB):`);
        console.log(`  - UTC: ${scheduledDate.toISOString()}`);
        console.log(`  - Local: ${scheduledDate.toString()}`);
        console.log(`  - UK Time: ${scheduledDate.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'full', timeStyle: 'long' })}`);
        console.log(`  - India Time: ${scheduledDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' })}`);
        
        // Check if overdue
        const timeDiff = scheduledDate - now;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        console.log(`\nTime Analysis:`);
        if (timeDiff < 0) {
          console.log(`  ⚠️  OVERDUE by ${Math.abs(hoursDiff).toFixed(2)} hours (${Math.abs(daysDiff).toFixed(2)} days)`);
          console.log(`  ⚠️  This post should have been published already!`);
        } else {
          console.log(`  ✓ Scheduled in ${hoursDiff.toFixed(2)} hours (${daysDiff.toFixed(2)} days)`);
        }
      } else {
        console.log(`\n⚠️  No scheduled time set!`);
      }

      if (post.publishedAt) {
        console.log(`\nPublished At: ${new Date(post.publishedAt).toISOString()}`);
      }

      console.log(`\nCreated At: ${new Date(post.createdAt).toISOString()}`);
      console.log(`Updated At: ${new Date(post.updatedAt).toISOString()}`);
    });

    console.log(`\n${'='.repeat(80)}`);
    console.log('SUMMARY');
    console.log(`${'='.repeat(80)}`);
    
    const overduePosts = scheduledPosts.filter(post => 
      post.scheduledAt && new Date(post.scheduledAt) < now
    );
    
    const upcomingPosts = scheduledPosts.filter(post => 
      post.scheduledAt && new Date(post.scheduledAt) >= now
    );

    console.log(`Total Scheduled Posts: ${scheduledPosts.length}`);
    console.log(`Overdue Posts: ${overduePosts.length}`);
    console.log(`Upcoming Posts: ${upcomingPosts.length}`);
    console.log();

    if (overduePosts.length > 0) {
      console.log('\n⚠️  OVERDUE POSTS DETAILS:');
      overduePosts.forEach((post, idx) => {
        const scheduledDate = new Date(post.scheduledAt);
        const timeDiff = now - scheduledDate;
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        console.log(`  ${idx + 1}. ${post.title || post.id} - Overdue by ${hoursDiff.toFixed(2)} hours`);
        console.log(`     Scheduled: ${scheduledDate.toISOString()}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('TIMEZONE CONVERSION EXAMPLES');
    console.log('='.repeat(80));
    console.log('\nIf you scheduled a post for "07 Apr 2026, 05:30" in UK time:');
    const ukExample = new Date('2026-04-07T05:30:00+01:00'); // BST (UK summer time)
    console.log(`  UK Time: ${ukExample.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);
    console.log(`  UTC: ${ukExample.toISOString()}`);
    console.log(`  India Time: ${ukExample.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    
    console.log('\nIf you scheduled a post for "07 Apr 2026, 05:30" in India time:');
    const indiaExample = new Date('2026-04-07T05:30:00+05:30'); // IST
    console.log(`  India Time: ${indiaExample.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
    console.log(`  UTC: ${indiaExample.toISOString()}`);
    console.log(`  UK Time: ${indiaExample.toLocaleString('en-GB', { timeZone: 'Europe/London' })}`);

  } catch (error) {
    console.error('Error checking scheduled times:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkScheduledTimes();
