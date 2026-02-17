const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    // First, let's see available roles
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        description: true
      }
    });

    console.log('\n=== Available Roles ===');
    roles.forEach(role => {
      console.log(`${role.id}: ${role.name} - ${role.description || 'N/A'}`);
    });

    // Find the BrandAdmin role
    const brandAdminRole = roles.find(r => r.name === 'BrandAdmin');
    
    if (!brandAdminRole) {
      console.log('\nBrandAdmin role not found!');
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: 'prakash10.prabisha@gmail.com' }
    });

    if (!user) {
      console.log('\nUser not found!');
      return;
    }

    // Find the brand connection
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: user.id,
        brand: {
          name: 'Prabisha Consulting'
        }
      },
      include: {
        brand: true,
        role: true
      }
    });

    if (!userBrand) {
      console.log('\nUser-Brand connection not found!');
      return;
    }

    console.log(`\n=== Current Status ===`);
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`Brand: ${userBrand.brand.name}`);
    console.log(`Current Role: ${userBrand.role.name} (${userBrand.roleId})`);

    // Update the role
    const updated = await prisma.userBrand.update({
      where: {
        id: userBrand.id
      },
      data: {
        roleId: brandAdminRole.id
      },
      include: {
        role: true,
        brand: true
      }
    });

    console.log(`\n=== Updated Status ===`);
    console.log(`New Role: ${updated.role.name} (${updated.roleId})`);
    console.log(`✓ Successfully updated to BrandAdmin`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();
