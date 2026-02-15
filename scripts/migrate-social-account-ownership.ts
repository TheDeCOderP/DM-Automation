/**
 * Migration script to populate connectedByUserId for existing SocialAccountBrand records
 * 
 * This script assigns ownership of social accounts to users based on:
 * 1. If there's only one user in the brand, assign to that user
 * 2. If there are multiple users, assign to the first admin user
 * 3. If no admin, assign to the first user in the brand
 */

import { prisma } from '../src/lib/prisma';

async function migrateSocialAccountOwnership() {
  console.log('Starting migration of social account ownership...');

  try {
    // Find all SocialAccountBrand records without a connectedByUserId
    const unassignedAccounts = await prisma.socialAccountBrand.findMany({
      where: {
        connectedByUserId: null
      },
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
        },
        socialAccount: {
          select: {
            platform: true,
            platformUsername: true
          }
        }
      }
    });

    console.log(`Found ${unassignedAccounts.length} social accounts without ownership`);

    for (const account of unassignedAccounts) {
      const members = account.brand.members;

      if (members.length === 0) {
        console.warn(`⚠️  Brand ${account.brand.name} has no members. Skipping account ${account.socialAccount.platform}`);
        continue;
      }

      // Priority: 1. BrandAdmin, 2. First member
      const adminMember = members.find(m => m.role.name === 'BrandAdmin');
      const assignedUser = adminMember || members[0];

      await prisma.socialAccountBrand.update({
        where: {
          id: account.id
        },
        data: {
          connectedByUserId: assignedUser.userId
        }
      });

      console.log(`✓ Assigned ${account.socialAccount.platform} (${account.socialAccount.platformUsername}) in brand "${account.brand.name}" to ${assignedUser.user.name || assignedUser.user.email}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log(`Updated ${unassignedAccounts.length} social account connections`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSocialAccountOwnership()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
