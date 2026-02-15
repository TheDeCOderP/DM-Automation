const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateBrands() {
  try {
    console.log('='.repeat(80));
    console.log('CLEANING UP DUPLICATE BRANDS');
    console.log('='.repeat(80));
    console.log();

    // Find all "Prabisha Consulting" brands
    const brands = await prisma.brand.findMany({
      where: { name: 'Prabisha Consulting' },
      include: {
        members: {
          include: {
            user: true
          }
        },
        posts: true,
        media: true,
        socialAccounts: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${brands.length} brands named "Prabisha Consulting"\n`);

    // Keep the one with Aanchal and Prakash (ID: cmlicb9n30000k1048ky19g3u)
    const keepBrandId = 'cmlicb9n30000k1048ky19g3u';

    brands.forEach((brand, index) => {
      const isKeeping = brand.id === keepBrandId;
      console.log(`${index + 1}. ${isKeeping ? '✅ KEEP' : '❌ DELETE'} - ID: ${brand.id}`);
      console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
      console.log(`   Members: ${brand.members.length}`);
      console.log(`   Posts: ${brand.posts.length}`);
      console.log(`   Media: ${brand.media.length}`);
      console.log(`   Social Accounts: ${brand.socialAccounts.length}`);
      
      if (brand.members.length > 0) {
        brand.members.forEach(member => {
          console.log(`      - ${member.user.name} (${member.user.email})`);
        });
      }
      console.log();
    });

    // Delete empty duplicate brands
    const brandsToDelete = brands.filter(b => 
      b.id !== keepBrandId && 
      b.members.length === 0 && 
      b.posts.length === 0
    );

    if (brandsToDelete.length === 0) {
      console.log('✅ No empty duplicate brands to delete');
      return;
    }

    console.log(`\nDeleting ${brandsToDelete.length} empty duplicate brands...\n`);

    for (const brand of brandsToDelete) {
      await prisma.brand.delete({
        where: { id: brand.id }
      });
      console.log(`   ✅ Deleted brand: ${brand.id} (Created: ${brand.createdAt.toLocaleDateString()})`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('CLEANUP COMPLETE');
    console.log('='.repeat(80));

    // Show remaining brands
    const remainingBrands = await prisma.brand.findMany({
      where: { name: 'Prabisha Consulting' }
    });

    console.log(`\n✅ Remaining "Prabisha Consulting" brands: ${remainingBrands.length}`);
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateBrands();
