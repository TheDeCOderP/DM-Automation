const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserBrands() {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: {
        email: 'prakash10.prabisha@gmail.com'
      },
      include: {
        brands: {
          include: {
            brand: true,
            role: true
          }
        }
      }
    });

    if (!user) {
      console.log('User not found with email: prakash10.prabisha@gmail.com');
      return;
    }

    console.log('\n=== User Information ===');
    console.log(`Name: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Active: ${user.isActive}`);

    console.log('\n=== Connected Brands ===');
    if (user.brands.length === 0) {
      console.log('No brands connected');
    } else {
      user.brands.forEach((userBrand, index) => {
        console.log(`\n${index + 1}. Brand: ${userBrand.brand.name}`);
        console.log(`   Brand ID: ${userBrand.brand.id}`);
        console.log(`   Role: ${userBrand.role.name}`);
        console.log(`   Role ID: ${userBrand.roleId}`);
        console.log(`   Description: ${userBrand.brand.description || 'N/A'}`);
        console.log(`   Connected Since: ${userBrand.createdAt.toISOString()}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBrands();
