const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function renameDuplicateBrands() {
  try {
    console.log('='.repeat(80));
    console.log('RENAMING DUPLICATE BRANDS');
    console.log('='.repeat(80));
    console.log();

    // Find all "Prabisha Consulting" brands except the one we want to keep
    const keepBrandId = 'cmlicb9n30000k1048ky19g3u';

    const brands = await prisma.brand.findMany({
      where: { 
        name: 'Prabisha Consulting',
        NOT: {
          id: keepBrandId
        }
      },
      include: {
        members: {
          include: {
            user: true
          }
        },
        posts: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`Found ${brands.length} duplicate "Prabisha Consulting" brands to rename\n`);

    if (brands.length === 0) {
      console.log('✅ No duplicate brands to rename');
      return;
    }

    for (const brand of brands) {
      // Get the primary member (first member or the one with most posts)
      const primaryMember = brand.members[0]?.user;
      
      let newName;
      if (primaryMember) {
        // Use member's name for the brand
        const firstName = primaryMember.name?.split(' ')[0] || 'User';
        newName = `Prabisha Consulting - ${firstName}`;
      } else {
        // Fallback to date-based name
        const date = brand.createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        newName = `Prabisha Consulting - ${date}`;
      }

      console.log(`\n📝 Renaming brand:`);
      console.log(`   Old Name: Prabisha Consulting`);
      console.log(`   New Name: ${newName}`);
      console.log(`   ID: ${brand.id}`);
      console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
      console.log(`   Members: ${brand.members.length}`);
      console.log(`   Posts: ${brand.posts.length}`);
      
      if (brand.members.length > 0) {
        console.log(`   Primary Member: ${primaryMember.name} (${primaryMember.email})`);
      }

      // Update the brand name
      await prisma.brand.update({
        where: { id: brand.id },
        data: { name: newName }
      });

      console.log(`   ✅ Renamed successfully`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('RENAMING COMPLETE');
    console.log('='.repeat(80));

    // Show all brands with "Prabisha" in name
    const allPrabishaBrands = await prisma.brand.findMany({
      where: { name: { contains: 'Prabisha' } },
      include: {
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

    console.log(`\n📊 All Prabisha brands (${allPrabishaBrands.length}):\n`);
    allPrabishaBrands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name}`);
      console.log(`   ID: ${brand.id}`);
      console.log(`   Members: ${brand.members.length}`);
      if (brand.members.length > 0) {
        brand.members.forEach(member => {
          console.log(`      - ${member.user.name} (${member.user.email})`);
        });
      }
      console.log();
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

renameDuplicateBrands();
