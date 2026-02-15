const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findCorrectBrand() {
  try {
    // Find all brands named "Prabisha Consulting"
    const brands = await prisma.brand.findMany({
      where: { name: { contains: 'Prabisha' } },
      include: {
        members: {
          include: {
            user: true,
            role: true
          }
        }
      }
    });

    console.log(`Found ${brands.length} brands with "Prabisha" in name:\n`);

    brands.forEach((brand, index) => {
      console.log(`${index + 1}. ${brand.name} (ID: ${brand.id})`);
      console.log(`   Created: ${brand.createdAt.toLocaleDateString()}`);
      console.log(`   Members: ${brand.members.length}`);
      brand.members.forEach(member => {
        console.log(`      - ${member.user.name} (${member.user.email}) - ${member.role.name}`);
      });
      console.log();
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findCorrectBrand();
