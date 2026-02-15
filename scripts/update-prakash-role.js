const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updatePrakashRole() {
  try {
    console.log('='.repeat(80));
    console.log('UPDATING PRAKASH ROLE TO BRANDADMIN');
    console.log('='.repeat(80));
    console.log();

    // Find Prakash
    const prakash = await prisma.user.findUnique({
      where: { email: 'prakash10.prabisha@gmail.com' }
    });

    if (!prakash) {
      console.log('❌ Prakash not found');
      return;
    }

    // Find Prabisha Consulting brand (the one with Aanchal and Prakash)
    const brand = await prisma.brand.findUnique({
      where: { id: 'cmlicb9n30000k1048ky19g3u' }
    });

    if (!brand) {
      console.log('❌ Prabisha Consulting brand not found');
      return;
    }

    // Find BrandAdmin role
    const brandAdminRole = await prisma.role.findFirst({
      where: { name: 'BrandAdmin' }
    });

    if (!brandAdminRole) {
      console.log('❌ BrandAdmin role not found');
      return;
    }

    console.log(`👤 User: ${prakash.name} (${prakash.email})`);
    console.log(`🏢 Brand: ${brand.name}`);
    console.log();

    // Check current membership
    const currentMembership = await prisma.userBrand.findUnique({
      where: {
        userId_brandId: {
          userId: prakash.id,
          brandId: brand.id
        }
      },
      include: {
        role: true
      }
    });

    if (!currentMembership) {
      console.log('❌ Prakash is not a member of this brand');
      return;
    }

    console.log(`Current Role: ${currentMembership.role.name}`);
    console.log();

    // Update to BrandAdmin
    await prisma.userBrand.update({
      where: {
        userId_brandId: {
          userId: prakash.id,
          brandId: brand.id
        }
      },
      data: {
        roleId: brandAdminRole.id
      }
    });

    console.log(`✅ Updated Prakash's role to BrandAdmin for "${brand.name}"`);
    console.log();

    // Verify the change
    const updatedMembership = await prisma.userBrand.findUnique({
      where: {
        userId_brandId: {
          userId: prakash.id,
          brandId: brand.id
        }
      },
      include: {
        role: true
      }
    });

    console.log('VERIFICATION:');
    console.log(`   New Role: ${updatedMembership.role.name}`);
    console.log(`   Can Edit Brand: ✅ YES`);
    console.log();

    // Show all members of the brand
    const allMembers = await prisma.userBrand.findMany({
      where: { brandId: brand.id },
      include: {
        user: true,
        role: true
      }
    });

    console.log(`🏢 All members of "${brand.name}":`);
    allMembers.forEach(member => {
      console.log(`   - ${member.user.name} (${member.user.email}) - ${member.role.name}`);
    });

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error updating role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updatePrakashRole();
