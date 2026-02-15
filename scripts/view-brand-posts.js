const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function viewBrandPosts() {
  try {
    console.log('='.repeat(80));
    console.log('BRAND POSTS REPORT');
    console.log('='.repeat(80));
    console.log();

    // Get all brands with their posts
    const brands = await prisma.brand.findMany({
      include: {
        posts: {
          include: {
            user: true,
            media: true,
            socialAccountPage: {
              include: {
                socialAccount: true
              }
            },
            analytics: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`📊 Total Brands: ${brands.length}\n`);

    brands.forEach((brand, index) => {
      console.log(`${index + 1}. 🏢 ${brand.name}`);
      console.log(`   ID: ${brand.id}`);
      console.log(`   Members: ${brand.members.length}`);
      console.log(`   Total Posts: ${brand.posts.length}`);

      if (brand.posts.length === 0) {
        console.log(`   ⚠️  No posts yet\n`);
        return;
      }

      // Group posts by status
      const statusGroups = {
        PUBLISHED: brand.posts.filter(p => p.status === 'PUBLISHED'),
        SCHEDULED: brand.posts.filter(p => p.status === 'SCHEDULED'),
        DRAFTED: brand.posts.filter(p => p.status === 'DRAFTED'),
        FAILED: brand.posts.filter(p => p.status === 'FAILED')
      };

      console.log(`   Status Breakdown:`);
      console.log(`   - Published: ${statusGroups.PUBLISHED.length}`);
      console.log(`   - Scheduled: ${statusGroups.SCHEDULED.length}`);
      console.log(`   - Drafted: ${statusGroups.DRAFTED.length}`);
      console.log(`   - Failed: ${statusGroups.FAILED.length}`);

      console.log(`\n   📝 Posts:\n`);

      brand.posts.forEach((post, postIndex) => {
        console.log(`   ${postIndex + 1}. ${post.title || 'Untitled Post'}`);
        console.log(`      ID: ${post.id}`);
        console.log(`      Platform: ${post.platform}`);
        console.log(`      Status: ${post.status}`);
        console.log(`      Created by: ${post.user.name || 'Unknown'} (${post.user.email})`);
        console.log(`      Created: ${post.createdAt.toLocaleDateString()}`);
        
        if (post.publishedAt) {
          console.log(`      Published: ${post.publishedAt.toLocaleDateString()}`);
        }
        
        if (post.scheduledAt) {
          console.log(`      Scheduled for: ${post.scheduledAt.toLocaleDateString()}`);
        }

        if (post.url) {
          console.log(`      URL: ${post.url}`);
        }

        // Social Account Page info
        if (post.socialAccountPage) {
          console.log(`      📱 Posted via: ${post.socialAccountPage.name}`);
          console.log(`         Account: @${post.socialAccountPage.socialAccount.platformUsername}`);
          console.log(`         Platform: ${post.socialAccountPage.platform}`);
        } else {
          console.log(`      📱 Posted via: Direct API (no page selected)`);
        }

        // Media
        if (post.media.length > 0) {
          console.log(`      🖼️  Media: ${post.media.length} file(s)`);
          post.media.forEach((media, i) => {
            console.log(`         ${i + 1}. ${media.type}: ${media.url.substring(0, 50)}...`);
          });
        }

        // Analytics
        if (post.analytics.length > 0) {
          const analytics = post.analytics[0];
          console.log(`      📊 Analytics:`);
          console.log(`         Likes: ${analytics.likes}, Comments: ${analytics.comments}, Shares: ${analytics.shares}`);
          console.log(`         Views: ${analytics.views}, Impressions: ${analytics.impressions}`);
        }

        console.log(`      Content: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);
        console.log();
      });

      console.log();
    });

    console.log('='.repeat(80));
    console.log('SUMMARY BY PLATFORM');
    console.log('='.repeat(80));

    // Get platform statistics
    const platformStats = await prisma.post.groupBy({
      by: ['platform', 'status'],
      _count: true
    });

    const platforms = {};
    platformStats.forEach(stat => {
      if (!platforms[stat.platform]) {
        platforms[stat.platform] = { total: 0, byStatus: {} };
      }
      platforms[stat.platform].total += stat._count;
      platforms[stat.platform].byStatus[stat.status] = stat._count;
    });

    console.log();
    Object.keys(platforms).sort().forEach(platform => {
      const stats = platforms[platform];
      console.log(`📱 ${platform}: ${stats.total} posts`);
      Object.keys(stats.byStatus).forEach(status => {
        console.log(`   - ${status}: ${stats.byStatus[status]}`);
      });
    });

    console.log();

  } catch (error) {
    console.error('❌ Error viewing brand posts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewBrandPosts();
