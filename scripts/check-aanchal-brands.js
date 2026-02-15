const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAanchalBrands() {
  try {
    console.log('='.repeat(80));
    console.log('AANCHAL\'S BRAND CONNECTIONS');
    console.log('='.repeat(80));
    console.log();

    // Find Aanchal
    const aanchal = await prisma.user.findUnique({
      where: { email: 'aanchal.prabisha@gmail.com' },
      include: {
        brands: {
          include: {
            brand: {
              include: {
                members: {
                  include: {
                    user: true,
                    role: true
                  }
                }
              }
            },
            role: true
          }
        }
      }
    });

    if (!aanchal) {
      console.log('❌ Aanchal not found');
      return;
    }

    console.log(`👤 User: ${aanchal.name} (${aanchal.email})`);
    console.log(`   ID: ${aanchal.id}`);
    console.log(`   Total Brands: ${aanchal.brands.length}`);
    console.log();

    if (aanchal.brands.length === 0) {
      console.log('   No brands connected');
      return;
    }

    aanchal.brands.forEach((userBrand, index) => {
      const brand = userBrand.brand;
      console.log(`\n${index + 1}. 🏢 ${brand.name}`);
      console.log(`   Brand ID: ${brand.id}`);
      console.log(`   Aanchal's Role: ${userBrand.role.name}`);
      console.log(`   Description: ${brand.description || 'No description'}`);
      console.log(`   Website: ${brand.website || 'No website'}`);
      console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
      
      console.log(`\n   👥 All Members (${brand.members.length}):`);
      brand.members.forEach(member => {
        const isAanchal = member.userId === aanchal.id;
        console.log(`      ${isAanchal ? '→' : ' '} ${member.user.name || 'No Name'} (${member.user.email})`);
        console.log(`        Role: ${member.role.name}`);
        console.log(`        Joined: ${member.createdAt.toLocaleDateString()}`);
      });

      // Check if Aanchal is the only member
      if (brand.members.length === 1) {
        console.log(`\n   ⚠️  Aanchal is the ONLY member - not shared with anyone`);
      } else {
        const otherMembers = brand.members.filter(m => m.userId !== aanchal.id);
        console.log(`\n   ✅ Shared with ${otherMembers.length} other member(s):`);
        otherMembers.forEach(member => {
          console.log(`      - ${member.user.name || 'No Name'} (${member.user.email}) as ${member.role.name}`);
        });
      }
    });

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error checking Aanchal\'s brands:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAanchalBrands();
