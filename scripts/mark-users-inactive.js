const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function markUsersInactive() {
  try {
    console.log('='.repeat(80));
    console.log('MARKING USERS AS INACTIVE');
    console.log('='.repeat(80));
    console.log();

    // First, make SuperAdmin and Admin active
    const adminRoles = ['SuperAdmin', 'Admin'];
    
    console.log('✅ Setting SuperAdmin and Admin as ACTIVE...');
    const activatedAdmins = await prisma.user.updateMany({
      where: {
        role: {
          name: {
            in: adminRoles
          }
        }
      },
      data: {
        isActive: true
      }
    });
    console.log(`   Activated ${activatedAdmins.count} admin users`);

    // Get all users who are NOT SuperAdmin or Admin
    const regularUsers = await prisma.user.findMany({
      where: {
        role: {
          name: {
            notIn: adminRoles
          }
        }
      },
      include: {
        role: true
      }
    });

    console.log(`\n❌ Marking ${regularUsers.length} regular users as INACTIVE...\n`);

    for (const user of regularUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isActive: false }
      });
      console.log(`   ❌ ${user.name || 'No Name'} (${user.email}) - Role: ${user.role.name}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));

    const activeCount = await prisma.user.count({
      where: { isActive: true }
    });

    const inactiveCount = await prisma.user.count({
      where: { isActive: false }
    });

    console.log(`\n✅ Active Users: ${activeCount}`);
    console.log(`❌ Inactive Users: ${inactiveCount}`);
    console.log(`📊 Total Users: ${activeCount + inactiveCount}`);

    console.log('\n✨ All regular users are now inactive and need admin approval!');
    console.log();

  } catch (error) {
    console.error('❌ Error marking users inactive:', error);
  } finally {
    await prisma.$disconnect();
  }
}

markUsersInactive();
