const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function compareBrandAdminUser() {
  try {
    console.log('='.repeat(80));
    console.log('BRANDADMIN vs USER COMPARISON');
    console.log('='.repeat(80));
    console.log();

    // Get BrandAdmin and User roles
    const brandAdmin = await prisma.role.findUnique({
      where: { name: 'BrandAdmin' },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        SidebarItemAccess: {
          include: {
            sidebarItem: true
          }
        },
        SidebarGroupAccess: {
          include: {
            sidebarGroup: {
              include: {
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    const user = await prisma.role.findUnique({
      where: { name: 'User' },
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        SidebarItemAccess: {
          include: {
            sidebarItem: true
          }
        },
        SidebarGroupAccess: {
          include: {
            sidebarGroup: {
              include: {
                items: true
              }
            }
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      }
    });

    // BrandAdmin Details
    console.log('🏢 BRANDADMIN ROLE');
    console.log('-'.repeat(80));
    console.log(`   Description: ${brandAdmin.description}`);
    console.log(`   Users with this role: ${brandAdmin._count.users}`);
    console.log(`   Is Default: ${brandAdmin.isDefault ? 'Yes' : 'No'}`);
    
    console.log(`\n   🔐 Permissions (${brandAdmin.permissions.length}):`);
    if (brandAdmin.permissions.length > 0) {
      brandAdmin.permissions.forEach(rp => {
        console.log(`      - ${rp.permission.name}`);
      });
    } else {
      console.log(`      No permissions assigned`);
    }

    console.log(`\n   📊 Sidebar Access:`);
    console.log(`      Groups: ${brandAdmin.SidebarGroupAccess.length}`);
    console.log(`      Items: ${brandAdmin.SidebarItemAccess.length}`);

    if (brandAdmin.SidebarGroupAccess.length > 0) {
      console.log(`\n   ✅ Accessible Sidebar Groups:`);
      brandAdmin.SidebarGroupAccess.forEach(access => {
        if (access.hasAccess) {
          console.log(`      - ${access.sidebarGroup.title}`);
          access.sidebarGroup.items.forEach(item => {
            console.log(`         • ${item.label} (${item.href})`);
          });
        }
      });
    }

    if (brandAdmin.SidebarItemAccess.length > 0) {
      console.log(`\n   ✅ Specific Sidebar Items:`);
      brandAdmin.SidebarItemAccess.forEach(access => {
        if (access.hasAccess) {
          console.log(`      - ${access.sidebarItem.label} (${access.sidebarItem.href})`);
        }
      });
    }

    // User Details
    console.log('\n\n👤 USER ROLE');
    console.log('-'.repeat(80));
    console.log(`   Description: ${user.description}`);
    console.log(`   Users with this role: ${user._count.users}`);
    console.log(`   Is Default: ${user.isDefault ? 'Yes' : 'No'}`);
    
    console.log(`\n   🔐 Permissions (${user.permissions.length}):`);
    if (user.permissions.length > 0) {
      user.permissions.forEach(rp => {
        console.log(`      - ${rp.permission.name}`);
      });
    } else {
      console.log(`      No permissions assigned`);
    }

    console.log(`\n   📊 Sidebar Access:`);
    console.log(`      Groups: ${user.SidebarGroupAccess.length}`);
    console.log(`      Items: ${user.SidebarItemAccess.length}`);

    if (user.SidebarGroupAccess.length > 0) {
      console.log(`\n   ✅ Accessible Sidebar Groups:`);
      user.SidebarGroupAccess.forEach(access => {
        if (access.hasAccess) {
          console.log(`      - ${access.sidebarGroup.title}`);
          access.sidebarGroup.items.forEach(item => {
            console.log(`         • ${item.label} (${item.href})`);
          });
        }
      });
    }

    if (user.SidebarItemAccess.length > 0) {
      console.log(`\n   ✅ Specific Sidebar Items:`);
      user.SidebarItemAccess.forEach(access => {
        if (access.hasAccess) {
          console.log(`      - ${access.sidebarItem.label} (${access.sidebarItem.href})`);
        }
      });
    }

    // Key Differences
    console.log('\n\n🔍 KEY DIFFERENCES');
    console.log('='.repeat(80));

    console.log('\n📋 Permissions:');
    console.log(`   BrandAdmin: ${brandAdmin.permissions.length} permissions`);
    console.log(`   User: ${user.permissions.length} permissions`);
    if (brandAdmin.permissions.length === 0 && user.permissions.length === 0) {
      console.log('   ⚠️  Both have NO permissions!');
    }

    console.log('\n📊 Sidebar Access:');
    console.log(`   BrandAdmin Groups: ${brandAdmin.SidebarGroupAccess.length}`);
    console.log(`   User Groups: ${user.SidebarGroupAccess.length}`);
    console.log(`   BrandAdmin Items: ${brandAdmin.SidebarItemAccess.length}`);
    console.log(`   User Items: ${user.SidebarItemAccess.length}`);

    // Find differences in sidebar access
    const brandAdminGroups = new Set(brandAdmin.SidebarGroupAccess.filter(a => a.hasAccess).map(a => a.sidebarGroup.title));
    const userGroups = new Set(user.SidebarGroupAccess.filter(a => a.hasAccess).map(a => a.sidebarGroup.title));

    const onlyBrandAdmin = [...brandAdminGroups].filter(g => !userGroups.has(g));
    const onlyUser = [...userGroups].filter(g => !brandAdminGroups.has(g));

    if (onlyBrandAdmin.length > 0) {
      console.log('\n   ✨ Groups ONLY BrandAdmin can access:');
      onlyBrandAdmin.forEach(g => console.log(`      - ${g}`));
    }

    if (onlyUser.length > 0) {
      console.log('\n   ✨ Groups ONLY User can access:');
      onlyUser.forEach(g => console.log(`      - ${g}`));
    }

    if (onlyBrandAdmin.length === 0 && onlyUser.length === 0) {
      console.log('\n   ⚠️  Both roles have access to the SAME sidebar groups!');
    }

    // Check specific items
    const brandAdminItems = new Set(brandAdmin.SidebarItemAccess.filter(a => a.hasAccess).map(a => a.sidebarItem.label));
    const userItems = new Set(user.SidebarItemAccess.filter(a => a.hasAccess).map(a => a.sidebarItem.label));

    const itemsOnlyBrandAdmin = [...brandAdminItems].filter(i => !userItems.has(i));
    const itemsOnlyUser = [...userItems].filter(i => !brandAdminItems.has(i));

    if (itemsOnlyBrandAdmin.length > 0) {
      console.log('\n   ✨ Items ONLY BrandAdmin can access:');
      itemsOnlyBrandAdmin.forEach(i => console.log(`      - ${i}`));
    }

    if (itemsOnlyUser.length > 0) {
      console.log('\n   ✨ Items ONLY User can access:');
      itemsOnlyUser.forEach(i => console.log(`      - ${i}`));
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error comparing roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

compareBrandAdminUser();
