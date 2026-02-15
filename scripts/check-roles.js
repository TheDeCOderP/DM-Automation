const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRoles() {
  try {
    console.log('='.repeat(80));
    console.log('ROLE COMPARISON: ADMIN vs SUPER ADMIN');
    console.log('='.repeat(80));
    console.log();

    // Get all roles with their permissions
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            users: true,
            SidebarGroupAccess: true,
            SidebarItemAccess: true,
            RolePageAccess: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    roles.forEach(role => {
      console.log(`\n📋 ${role.name.toUpperCase()}`);
      console.log('-'.repeat(80));
      console.log(`   ID: ${role.id}`);
      console.log(`   Description: ${role.description || 'No description'}`);
      console.log(`   Is Default: ${role.isDefault ? 'Yes' : 'No'}`);
      console.log(`   Users with this role: ${role._count.users}`);
      console.log(`   Created: ${role.createdAt.toLocaleDateString()}`);
      
      console.log(`\n   🔐 Permissions (${role.permissions.length}):`);
      if (role.permissions.length > 0) {
        role.permissions.forEach(rp => {
          console.log(`      - ${rp.permission.name}: ${rp.permission.description || 'No description'}`);
        });
      } else {
        console.log(`      No permissions assigned`);
      }

      console.log(`\n   📊 Access Controls:`);
      console.log(`      - Sidebar Groups: ${role._count.SidebarGroupAccess}`);
      console.log(`      - Sidebar Items: ${role._count.SidebarItemAccess}`);
      console.log(`      - Pages: ${role._count.RolePageAccess}`);
    });

    console.log();
    console.log('='.repeat(80));
    console.log('KEY DIFFERENCES');
    console.log('='.repeat(80));

    const superAdmin = roles.find(r => r.name === 'SuperAdmin');
    const admin = roles.find(r => r.name === 'Admin');

    if (superAdmin && admin) {
      console.log('\nSuperAdmin vs Admin:');
      console.log(`   SuperAdmin Permissions: ${superAdmin.permissions.length}`);
      console.log(`   Admin Permissions: ${admin.permissions.length}`);
      
      const superAdminPerms = new Set(superAdmin.permissions.map(p => p.permission.name));
      const adminPerms = new Set(admin.permissions.map(p => p.permission.name));
      
      const onlyInSuperAdmin = [...superAdminPerms].filter(p => !adminPerms.has(p));
      const onlyInAdmin = [...adminPerms].filter(p => !superAdminPerms.has(p));
      
      if (onlyInSuperAdmin.length > 0) {
        console.log('\n   ✨ Permissions ONLY SuperAdmin has:');
        onlyInSuperAdmin.forEach(p => console.log(`      - ${p}`));
      }
      
      if (onlyInAdmin.length > 0) {
        console.log('\n   ✨ Permissions ONLY Admin has:');
        onlyInAdmin.forEach(p => console.log(`      - ${p}`));
      }

      if (onlyInSuperAdmin.length === 0 && onlyInAdmin.length === 0) {
        console.log('\n   ⚠️  Both roles have the SAME permissions!');
      }
    }

    console.log();

  } catch (error) {
    console.error('❌ Error checking roles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRoles();
