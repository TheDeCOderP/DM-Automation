const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPostGroup() {
  try {
    const postGroupId = 'cmlpln1910000l2045yqy3paj';
    
    console.log(`=== Checking Post Group: ${postGroupId} ===\n`);

    // Check if post group exists
    const postGroup = await prisma.postGroup.findUnique({
      where: { id: postGroupId },
      include: {
        posts: {
          include: {
            media: true,
          },
        },
        calendarItems: true,
      },
    });

    if (!postGroup) {
      console.log('❌ Post group not found');
      return;
    }

    console.log(`✓ Post group exists`);
    console.log(`Created: ${postGroup.createdAt.toISOString()}`);
    console.log(`Updated: ${postGroup.updatedAt.toISOString()}`);
    console.log(`\nPosts in group: ${postGroup.posts.length}`);
    console.log(`Calendar items linked: ${postGroup.calendarItems.length}`);

    if (postGroup.posts.length > 0) {
      console.log('\n--- Posts ---');
      postGroup.posts.forEach((post, idx) => {
        console.log(`\n${idx + 1}. Post ID: ${post.id}`);
        console.log(`   Platform: ${post.platform}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Title: ${post.title || 'N/A'}`);
        console.log(`   Scheduled: ${post.scheduledAt?.toISOString() || 'N/A'}`);
        console.log(`   Published: ${post.publishedAt?.toISOString() || 'N/A'}`);
        console.log(`   Media: ${post.media.length} items`);
      });
    } else {
      console.log('\n⚠️  No posts found in this group!');
      console.log('This means either:');
      console.log('  1. Posts were never created during scheduling');
      console.log('  2. Posts were deleted after scheduling');
      console.log('  3. There was an error during the scheduling process');
    }

    if (postGroup.calendarItems.length > 0) {
      console.log('\n--- Calendar Items ---');
      postGroup.calendarItems.forEach((item, idx) => {
        console.log(`\n${idx + 1}. Calendar Item ID: ${item.id}`);
        console.log(`   Day: ${item.day}`);
        console.log(`   Topic: ${item.topic}`);
        console.log(`   Status: ${item.status}`);
        console.log(`   Suggested Time: ${item.suggestedTime?.toISOString() || 'N/A'}`);
      });
    }

    // Check if there are any posts that should be in this group but aren't
    console.log('\n--- Checking for orphaned posts ---');
    const orphanedPosts = await prisma.post.findMany({
      where: {
        platformMetadata: {
          path: ['calendarItemId'],
          equals: 'cmlphq6pg0002ut58pmroghko',
        },
      },
    });

    if (orphanedPosts.length > 0) {
      console.log(`\n⚠️  Found ${orphanedPosts.length} posts with calendarItemId in metadata but not in post group:`);
      orphanedPosts.forEach((post, idx) => {
        console.log(`  ${idx + 1}. Post ID: ${post.id}, Platform: ${post.platform}, Status: ${post.status}`);
      });
    } else {
      console.log('No orphaned posts found');
    }

  } catch (error) {
    console.error('Error checking post group:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPostGroup();
