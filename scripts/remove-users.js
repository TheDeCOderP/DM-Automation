const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeUsers() {
  try {
    const emailsToRemove = [
      'user@prabisha.com',
      'chittranjan.prabisha@gmail.com'
    ];

    console.log('='.repeat(80));
    console.log('REMOVING USERS');
    console.log('='.repeat(80));
    console.log();

    for (const email of emailsToRemove) {
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
        continue;
      }

      console.log(`\n🔍 Found user: ${user.name || 'No Name'} (${email})`);
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

      console.log(`   ✅ Successfully deleted user: ${email}`);
    }

    console.log();
    console.log('='.repeat(80));
    console.log('DELETION COMPLETE');
    console.log('='.repeat(80));

    // Show updated user count
    const remainingUsers = await prisma.user.count();
    console.log(`\n📊 Remaining users: ${remainingUsers}`);

  } catch (error) {
    console.error('❌ Error removing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeUsers();
