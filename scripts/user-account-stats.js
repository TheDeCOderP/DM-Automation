const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getUserStats() {
  try {
    console.log('='.repeat(80));
    console.log('USER STATISTICS REPORT');
    console.log('='.repeat(80));
    console.log();

    // Get total users count
    const totalUsers = await prisma.user.count();
    console.log(`📊 Total Users: ${totalUsers}`);
    console.log();

    // Get users with their roles and connected accounts
    const users = await prisma.user.findMany({
      include: {
        role: true,
        accounts: true,
        socialAccounts: {
          include: {
            socialAccount: true
          }
        },
        brands: {
          include: {
            brand: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('👥 USER DETAILS:');
    console.log('-'.repeat(80));

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.name || 'No Name'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Role: ${user.role.name} (${user.role.description || 'No description'})`);
      console.log(`   Created: ${user.createdAt.toLocaleDateString()}`);
      
      // OAuth Accounts (Google, etc.)
      if (user.accounts.length > 0) {
        console.log(`   \n   🔐 OAuth Accounts (${user.accounts.length}):`);
        user.accounts.forEach(account => {
          console.log(`      - ${account.provider} (ID: ${account.providerAccountId})`);
        });
      } else {
        console.log(`   🔐 OAuth Accounts: None`);
      }

      // Social Media Accounts
      if (user.socialAccounts.length > 0) {
        console.log(`   \n   📱 Social Media Accounts (${user.socialAccounts.length}):`);
        user.socialAccounts.forEach(sa => {
          console.log(`      - ${sa.socialAccount.platform}: @${sa.socialAccount.platformUsername}`);
        });
      } else {
        console.log(`   📱 Social Media Accounts: None`);
      }

      // Brand Memberships
      if (user.brands.length > 0) {
        console.log(`   \n   🏢 Brand Memberships (${user.brands.length}):`);
        user.brands.forEach(ub => {
          console.log(`      - ${ub.brand.name} (Role: ${ub.role.name})`);
        });
      } else {
        console.log(`   🏢 Brand Memberships: None`);
      }
    });

    console.log();
    console.log('='.repeat(80));
    console.log('SUMMARY STATISTICS');
    console.log('='.repeat(80));

    // Role distribution
    const roleStats = await prisma.user.groupBy({
      by: ['roleId'],
      _count: true
    });

    console.log('\n📋 Users by Role:');
    for (const stat of roleStats) {
      const role = await prisma.role.findUnique({
        where: { id: stat.roleId }
      });
      console.log(`   ${role.name}: ${stat._count} users`);
    }

    // OAuth account stats
    const totalOAuthAccounts = await prisma.account.count();
    const accountsByProvider = await prisma.account.groupBy({
      by: ['provider'],
      _count: true
    });

    console.log(`\n🔐 Total OAuth Accounts: ${totalOAuthAccounts}`);
    if (accountsByProvider.length > 0) {
      console.log('   By Provider:');
      accountsByProvider.forEach(stat => {
        console.log(`   - ${stat.provider}: ${stat._count}`);
      });
    }

    // Social media account stats
    const totalSocialAccounts = await prisma.socialAccount.count();
    const socialAccountsByPlatform = await prisma.socialAccount.groupBy({
      by: ['platform'],
      _count: true
    });

    console.log(`\n📱 Total Social Media Accounts: ${totalSocialAccounts}`);
    if (socialAccountsByPlatform.length > 0) {
      console.log('   By Platform:');
      socialAccountsByPlatform.forEach(stat => {
        console.log(`   - ${stat.platform}: ${stat._count}`);
      });
    }

    // Brand stats
    const totalBrands = await prisma.brand.count();
    const totalBrandMemberships = await prisma.userBrand.count();

    console.log(`\n🏢 Total Brands: ${totalBrands}`);
    console.log(`   Total Brand Memberships: ${totalBrandMemberships}`);

    console.log();
    console.log('='.repeat(80));

  } catch (error) {
    console.error('Error fetching user stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getUserStats();
