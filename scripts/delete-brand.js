const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteBrand() {
  try {
    console.log('='.repeat(80));
    console.log('DELETING BRAND');
    console.log('='.repeat(80));
    console.log();

    const brandName = 'Prabisha New';

    // Find the brand
    const brand = await prisma.brand.findFirst({
      where: { name: brandName },
      include: {
        members: {
          include: {
            user: true
          }
        },
        posts: true,
        media: true,
        socialAccounts: true
      }
    });

    if (!brand) {
      console.log(`❌ Brand "${brandName}" not found`);
      return;
    }

    console.log(`🔍 Found brand: ${brand.name}`);
    console.log(`   ID: ${brand.id}`);
    console.log(`   Members: ${brand.members.length}`);
    console.log(`   Posts: ${brand.posts.length}`);
    console.log(`   Media: ${brand.media.length}`);
    console.log(`   Social Accounts: ${brand.socialAccounts.length}`);
    console.log();

    if (brand.members.length > 0) {
      console.log('   Members:');
      brand.members.forEach(member => {
        console.log(`   - ${member.user.name} (${member.user.email})`);
      });
      console.log();
    }

    // Delete the brand (cascade will handle related records)
    await prisma.brand.delete({
      where: { id: brand.id }
    });

    console.log(`✅ Successfully deleted brand: ${brandName}`);
    console.log();

    // Show remaining brands count
    const remainingBrands = await prisma.brand.count();
    console.log(`📊 Remaining brands: ${remainingBrands}`);
    console.log();

  } catch (error) {
    console.error('❌ Error deleting brand:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteBrand();
