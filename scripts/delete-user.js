const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUser() {
  try {
    const email = 'developerprakash10@gmail.com';

    console.log('='.repeat(80));
    console.log('DELETING USER');
    console.log('='.repeat(80));
    console.log();

    // Find the user first
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accounts: true,
        socialAccounts: true,
        brands: true,
        posts: true,
        media: true,
        notifications: true
      }
    });

    if (!user) {
      console.log(`❌ User not found: ${email}`);
      return;
    }

    console.log(`🔍 Found user: ${user.name || 'No Name'} (${email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   OAuth Accounts: ${user.accounts.length}`);
    console.log(`   Social Accounts: ${user.socialAccounts.length}`);
    console.log(`   Brand Memberships: ${user.brands.length}`);
    console.log(`   Posts: ${user.posts.length}`);
    console.log(`   Media: ${user.media.length}`);
    console.log(`   Notifications: ${user.notifications.length}`);

    // Delete the user (cascade will handle related records)
    await prisma.user.delete({
      where: { email }
    });

    console.log(`\n✅ Successfully deleted user: ${email}`);

    // Show updated user count
    const remainingUsers = await prisma.user.count();
    console.log(`\n📊 Remaining users: ${remainingUsers}`);
    console.log();

  } catch (error) {
    console.error('❌ Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteUser();
