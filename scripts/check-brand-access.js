const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBrandAccess() {
  try {
    console.log('='.repeat(80));
    console.log('BRAND & ACCOUNT ACCESS CHECK');
    console.log('='.repeat(80));
    console.log();

    // Get SuperAdmin and Admin roles
    const superAdmin = await prisma.role.findUnique({
      where: { name: 'SuperAdmin' },
      include: {
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
        }
      }
    });

    const admin = await prisma.role.findUnique({
      where: { name: 'Admin' },
      include: {
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
        }
      }
    });

    // Get all sidebar items to see what's available
    const allSidebarItems = await prisma.sidebarItem.findMany({
      include: {
        sidebarGroup: true
      },
      orderBy: {
        position: 'asc'
      }
    });

    console.log('📋 ALL AVAILABLE SIDEBAR ITEMS:');
    console.log('-'.repeat(80));
    allSidebarItems.forEach(item => {
      console.log(`   ${item.label} (${item.href}) - Group: ${item.sidebarGroup.title}`);
    });

    console.log('\n\n🔐 SUPERADMIN ACCESS:');
    console.log('-'.repeat(80));
    
    if (superAdmin.SidebarItemAccess.length > 0) {
      console.log('   Sidebar Items:');
      superAdmin.SidebarItemAccess.forEach(access => {
        console.log(`   ${access.hasAccess ? '✅' : '❌'} ${access.sidebarItem.label} (${access.sidebarItem.href})`);
      });
    } else {
      console.log('   ⚠️  No specific sidebar item access defined (might have full access by default)');
    }

    if (superAdmin.SidebarGroupAccess.length > 0) {
      console.log('\n   Sidebar Groups:');
      superAdmin.SidebarGroupAccess.forEach(access => {
        console.log(`   ${access.hasAccess ? '✅' : '❌'} ${access.sidebarGroup.title}`);
        if (access.hasAccess && access.sidebarGroup.items.length > 0) {
          access.sidebarGroup.items.forEach(item => {
            console.log(`      - ${item.label} (${item.href})`);
          });
        }
      });
    }

    console.log('\n\n🔐 ADMIN ACCESS:');
    console.log('-'.repeat(80));
    
    if (admin.SidebarItemAccess.length > 0) {
      console.log('   Sidebar Items:');
      admin.SidebarItemAccess.forEach(access => {
        console.log(`   ${access.hasAccess ? '✅' : '❌'} ${access.sidebarItem.label} (${access.sidebarItem.href})`);
      });
    } else {
      console.log('   ⚠️  No specific sidebar item access defined');
    }

    if (admin.SidebarGroupAccess.length > 0) {
      console.log('\n   Sidebar Groups:');
      admin.SidebarGroupAccess.forEach(access => {
        console.log(`   ${access.hasAccess ? '✅' : '❌'} ${access.sidebarGroup.title}`);
        if (access.hasAccess && access.sidebarGroup.items.length > 0) {
          access.sidebarGroup.items.forEach(item => {
            console.log(`      - ${item.label} (${item.href})`);
          });
        }
      });
    }

    // Check for brand and account related items
    console.log('\n\n🏢 BRAND & ACCOUNT RELATED ACCESS:');
    console.log('-'.repeat(80));
    
    const brandRelatedItems = allSidebarItems.filter(item => 
      item.label.toLowerCase().includes('brand') || 
      item.label.toLowerCase().includes('account') ||
      item.href.includes('brand') ||
      item.href.includes('account')
    );

    if (brandRelatedItems.length > 0) {
      console.log('\n   Brand/Account related items found:');
      brandRelatedItems.forEach(item => {
        const superAdminAccess = superAdmin.SidebarItemAccess.find(a => a.sidebarItemId === item.id);
        const adminAccess = admin.SidebarItemAccess.find(a => a.sidebarItemId === item.id);
        
        console.log(`\n   📌 ${item.label} (${item.href})`);
        console.log(`      SuperAdmin: ${superAdminAccess ? (superAdminAccess.hasAccess ? '✅ YES' : '❌ NO') : '⚠️  Not defined'}`);
        console.log(`      Admin: ${adminAccess ? (adminAccess.hasAccess ? '✅ YES' : '❌ NO') : '⚠️  Not defined'}`);
      });
    } else {
      console.log('   ⚠️  No brand/account related sidebar items found');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error checking brand access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBrandAccess();
