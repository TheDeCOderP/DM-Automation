const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function activateAndShareBrands() {
  try {
    console.log('='.repeat(80));
    console.log('ACTIVATE USERS AND SHARE BRANDS');
    console.log('='.repeat(80));
    console.log();

    // Check if developerprakash exists
    let prakash = await prisma.user.findUnique({
      where: { email: 'developerprakash10@gmail.com' }
    });

    if (!prakash) {
      console.log('⚠️  developerprakash10@gmail.com was deleted earlier.');
      console.log('   Looking for alternative Prakash user...\n');
      
      // Find prakash10.prabisha@gmail.com instead
      prakash = await prisma.user.findUnique({
        where: { email: 'prakash10.prabisha@gmail.com' }
      });

      if (!prakash) {
        console.log('❌ No Prakash user found. Please specify which user to use.');
        return;
      }
    }

    // Find Aanchal
    const aanchal = await prisma.user.findUnique({
      where: { email: 'aanchal.prabisha@gmail.com' },
      include: {
        brands: {
          include: {
            brand: true
          }
        }
      }
    });

    if (!aanchal) {
      console.log('❌ Aanchal not found');
      return;
    }

    console.log('STEP 1: Activating Users');
    console.log('-'.repeat(80));

    // Activate Aanchal
    await prisma.user.update({
      where: { id: aanchal.id },
      data: { isActive: true }
    });
    console.log(`✅ Activated: ${aanchal.name} (${aanchal.email})`);

    // Activate Prakash
    await prisma.user.update({
      where: { id: prakash.id },
      data: { isActive: true }
    });
    console.log(`✅ Activated: ${prakash.name} (${prakash.email})`);

    console.log();
    console.log('STEP 2: Sharing Brands');
    console.log('-'.repeat(80));

    if (aanchal.brands.length === 0) {
      console.log('⚠️  Aanchal has no brands to share');
      return;
    }

    // Get BrandUser role
    const brandUserRole = await prisma.role.findUnique({
      where: { name: 'BrandUser' }
    });

    if (!brandUserRole) {
      console.log('❌ BrandUser role not found');
      return;
    }

    for (const userBrand of aanchal.brands) {
      const brand = userBrand.brand;
      
      // Check if Prakash is already a member
      const existingMembership = await prisma.userBrand.findUnique({
        where: {
          userId_brandId: {
            userId: prakash.id,
            brandId: brand.id
          }
        }
      });

      if (existingMembership) {
        console.log(`⚠️  ${prakash.name} is already a member of "${brand.name}"`);
        continue;
      }

      // Add Prakash to the brand
      await prisma.userBrand.create({
        data: {
          userId: prakash.id,
          brandId: brand.id,
          roleId: brandUserRole.id
        }
      });

      console.log(`✅ Shared "${brand.name}" with ${prakash.name} as BrandUser`);
    }

    console.log();
    console.log('STEP 3: Verification');
    console.log('-'.repeat(80));

    // Verify the changes
    const updatedAanchal = await prisma.user.findUnique({
      where: { id: aanchal.id },
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
            }
          }
        }
      }
    });

    updatedAanchal.brands.forEach(userBrand => {
      const brand = userBrand.brand;
      console.log(`\n🏢 ${brand.name}`);
      console.log(`   Members (${brand.members.length}):`);
      brand.members.forEach(member => {
        console.log(`   - ${member.user.name} (${member.user.email}) - ${member.role.name}`);
      });
    });

    console.log();
    console.log('='.repeat(80));
    console.log('✨ COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log();

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateAndShareBrands();
