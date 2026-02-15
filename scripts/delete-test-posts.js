const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTestPosts() {
  try {
    console.log('='.repeat(80));
    console.log('DELETING TEST POSTS');
    console.log('='.repeat(80));
    console.log();

    // Find all posts with "Untitled Post" or test-related titles/content
    const testPosts = await prisma.post.findMany({
      where: {
        OR: [
          { title: 'Untitled Post' },
          { title: { contains: 'Test' } },
          { title: { contains: 'test' } },
          { title: { contains: 'TEST' } },
          { content: { contains: 'test' } },
          { content: { contains: 'Test' } },
          { content: { contains: 'TEST' } },
        ]
      },
      include: {
        brand: true,
        user: true,
        media: true
      }
    });

    console.log(`🔍 Found ${testPosts.length} test posts to delete\n`);

    if (testPosts.length === 0) {
      console.log('✅ No test posts found!');
      return;
    }

    // Group by brand for better visibility
    const postsByBrand = {};
    testPosts.forEach(post => {
      const brandName = post.brand.name;
      if (!postsByBrand[brandName]) {
        postsByBrand[brandName] = [];
      }
      postsByBrand[brandName].push(post);
    });

    console.log('Posts to be deleted by brand:');
    console.log('-'.repeat(80));
    Object.keys(postsByBrand).forEach(brandName => {
      console.log(`\n🏢 ${brandName}: ${postsByBrand[brandName].length} posts`);
      postsByBrand[brandName].slice(0, 5).forEach(post => {
        console.log(`   - ${post.title || 'No title'} (${post.platform}) - ${post.status}`);
      });
      if (postsByBrand[brandName].length > 5) {
        console.log(`   ... and ${postsByBrand[brandName].length - 5} more`);
      }
    });

    console.log('\n' + '='.repeat(80));
    console.log('DELETING POSTS...');
    console.log('='.repeat(80));
    console.log();

    // Delete all test posts
    const deleteResult = await prisma.post.deleteMany({
      where: {
        OR: [
          { title: 'Untitled Post' },
          { title: { contains: 'Test' } },
          { title: { contains: 'test' } },
          { title: { contains: 'TEST' } },
          { content: { contains: 'test' } },
          { content: { contains: 'Test' } },
          { content: { contains: 'TEST' } },
        ]
      }
    });

    console.log(`✅ Successfully deleted ${deleteResult.count} test posts`);
    console.log();

    // Show remaining posts count
    const remainingPosts = await prisma.post.count();
    console.log(`📊 Remaining posts: ${remainingPosts}`);
    console.log();

    // Show breakdown by platform
    const platformStats = await prisma.post.groupBy({
      by: ['platform'],
      _count: true
    });

    if (platformStats.length > 0) {
      console.log('Remaining posts by platform:');
      platformStats.forEach(stat => {
        console.log(`   ${stat.platform}: ${stat._count}`);
      });
    }

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error deleting test posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestPosts();
