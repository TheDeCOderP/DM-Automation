const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBrandPosts() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING POSTS IN PRABISHA CONSULTING (PRAKASH\'S BRAND)');
    console.log('='.repeat(80));
    console.log();

    const brandId = 'cmlicb9n30000k1048ky19g3u';

    // Get brand details
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        members: {
          include: {
            user: true,
            role: true
          }
        },
        posts: {
          include: {
            user: true,
            media: true,
            socialAccountPage: {
              include: {
                socialAccount: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    console.log(`🏢 Brand: ${brand.name}`);
    console.log(`   ID: ${brand.id}`);
    console.log(`   Members: ${brand.members.length}`);
    console.log();

    console.log('👥 Members:');
    brand.members.forEach(member => {
      console.log(`   - ${member.user.name} (${member.user.email}) - ${member.role.name}`);
    });
    console.log();

    console.log(`📝 Total Posts: ${brand.posts.length}`);
    console.log();

    if (brand.posts.length === 0) {
      console.log('⚠️  No posts found in this brand');
    } else {
      console.log('Posts:');
      console.log('-'.repeat(80));
      
      brand.posts.forEach((post, index) => {
        console.log(`\n${index + 1}. ${post.title || 'Untitled'}`);
        console.log(`   Platform: ${post.platform}`);
        console.log(`   Status: ${post.status}`);
        console.log(`   Created by: ${post.user.name} (${post.user.email})`);
        console.log(`   Created: ${post.createdAt.toLocaleDateString()}`);
        
        if (post.publishedAt) {
          console.log(`   Published: ${post.publishedAt.toLocaleDateString()}`);
        }
        
        if (post.url) {
          console.log(`   URL: ${post.url}`);
        }

        if (post.socialAccountPage) {
          console.log(`   Posted via: ${post.socialAccountPage.pageName} (@${post.socialAccountPage.socialAccount.platformUsername})`);
        }

        if (post.media.length > 0) {
          console.log(`   Media: ${post.media.length} file(s)`);
        }

        console.log(`   Content: ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}`);
      });
    }

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrandPosts();
