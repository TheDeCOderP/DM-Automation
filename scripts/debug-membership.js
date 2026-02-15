const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugMembership() {
  try {
    // Find Prakash
    const prakash = await prisma.user.findUnique({
      where: { email: 'prakash10.prabisha@gmail.com' }
    });

    console.log('Prakash:', prakash);

    // Find brand
    const brand = await prisma.brand.findFirst({
      where: { name: 'Prabisha Consulting' }
    });

    console.log('Brand:', brand);

    // Find membership
    const membership = await prisma.userBrand.findMany({
      where: {
        userId: prakash.id,
        brandId: brand.id
      }
    });

    console.log('Membership:', membership);

    // Find all memberships for this brand
    const allMemberships = await prisma.userBrand.findMany({
      where: { brandId: brand.id },
      include: { user: true, role: true }
    });

    console.log('All memberships:', JSON.stringify(allMemberships, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugMembership();
