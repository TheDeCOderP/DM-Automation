
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Helper: generate next custom user ID
async function getNextUserId() {
  const lastUser = await prisma.user.findFirst({
    orderBy: { id: "desc" }, // lexicographic works with PCU-000X
  });

  if (!lastUser) return "PCU-0001";

  const lastNum = parseInt(lastUser.id.replace("PCU-", ""), 10);
  const nextNum = lastNum + 1;
  return `PCU-${String(nextNum).padStart(4, "0")}`;
}

// Safe user create (skip if email exists, otherwise auto-generate ID)
async function createUserIfNotExists(email, name, password, roleId) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`ℹ️ User ${email} already exists (ID: ${existing.id})`);
    return existing;
  }

  const newId = await getNextUserId();

  const user = await prisma.user.create({
    data: {
      id: newId,
      email,
      name,
      password,
      roleId,
    },
  });

  console.log(`✅ Created user ${email} with ID ${newId}`);
  return user;
}

async function main() {
  // Hash passwords
  const superAdminPassword = await bcrypt.hash("super-admin123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Seed roles - explicit IDs
  const [superAdminRole, adminRole, userRole, brandUserRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "SUPERADMIN" },
      update: {},
      create: { id: "PCR-0001", name: "SUPERADMIN" },
    }),
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { id: "PCR-0002", name: "ADMIN" },
    }),
    prisma.role.upsert({
      where: { name: "USER" },
      update: {},
      create: { id: "PCR-0003", name: "USER" },
    }),
    prisma.role.upsert({
      where: { name: "BRAND_USER" },
      update: {},
      create: { id: "PCR-0004", name: "BRAND_ADMIN", description: "The one who creates a brand" },
    }),
    prisma.role.upsert({
      where: { name: "BRAND_USER" },
      update: {},
      create: { id: "PCR-0005", name: "BRAND_USER", description: "The one who works for a brand" },
    }),
  ]);

  // Seed permissions
  const permissionNames = [
    "roles:manage",
    "users:manage",
    "settings:update",
    "analytics:read",
    "sidebar:write",
    "ideas:moderate",
  ];
  const permissions = await Promise.all(
    permissionNames.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  const permissionsMap = Object.fromEntries(
    permissions.map((p) => [p.name, p.id])
  );

  // Helper to ensure role-permission link exists
  async function link(roleId, permName) {
    const permissionId = permissionsMap[permName];
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
  }

  // SUPERADMIN gets all
  for (const perm of permissionNames) {
    await link(superAdminRole.id, perm);
  }
  // ADMIN gets subset
  for (const perm of ["analytics:read", "settings:update", "sidebar:write", "ideas:moderate"]) {
    await link(adminRole.id, perm);
  }

  // Create users with auto-increment PCU-IDs
  await createUserIfNotExists(
    "super-admin@prabisha.com",
    "Super Admin",
    superAdminPassword,
    superAdminRole.id
  );
  await createUserIfNotExists(
    "admin@prabisha.com",
    "Admin",
    adminPassword,
    adminRole.id
  );
  await createUserIfNotExists(
    "user@prabisha.com",
    "User",
    userPassword,
    userRole.id
  );

  // Create default theme
  await prisma.theme.upsert({
    where: { themeName: "Prabisha Consulting" },
    update: {
      primaryColor: "#111CA8",
      secondaryColor: "#DE6A2C",
      font: "Montserrat",
    },
    create: {
      themeName: "Prabisha Consulting",
      primaryColor: "#111CA8",
      secondaryColor: "#DE6A2C",
      font: "Montserrat",
      tertiaryColor: "#000000",
      backgroundColor: "#ffffff",
      textColor: "#000000",
      mode: "LIGHT",
    },
  });

  // Ensure singleton site config
  console.log("Seeding: SiteConfig -> ensuring single record...");
  const existingConfigs = await prisma.siteConfig.findMany({
    orderBy: { createdAt: "asc" },
  });
  if (existingConfigs.length > 1) {
    const toDeleteIds = existingConfigs.slice(1).map((c) => c.id);
    await prisma.siteConfig.deleteMany({ where: { id: { in: toDeleteIds } } });
    console.log(
      `Cleaned up ${toDeleteIds.length} duplicate SiteConfig record(s).`
    );
  }

  const SITE_CONFIG_ID = "singleton";
  await prisma.siteConfig.upsert({
    where: { id: SITE_CONFIG_ID },
    update: {
      domain: "https://prabisha.com",
      supportEmail: "info@prabisha.com",
    },
    create: {
      id: SITE_CONFIG_ID,
      siteName: "Prabisha Consulting",
      siteDescription: "Prabisha Consulting",
      domain: "https://prabisha.com",
      supportEmail: "info@prabisha.com",
    },
  });
  console.log("Seeding: SiteConfig -> done.");

  // Sidebar Groups & Items
  const managementGroup = await prisma.sidebarGroup.upsert({
    where: { title: "Management" },
    update: {},
    create: { title: "Management", position: 0, isActive: true },
  });
  await prisma.sidebarGroupAccess.upsert({
    where: {
      roleId_sidebarGroupId: {
        roleId: superAdminRole.id,
        sidebarGroupId: managementGroup.id,
      },
    },
    update: { hasAccess: true },
    create: {
      roleId: superAdminRole.id,
      sidebarGroupId: managementGroup.id,
      hasAccess: true,
    },
  });

  const usersItem = await prisma.sidebarItem.upsert({
    where: { href: "/admin/users" },
    update: {
      label: "Users",
      icon: "users",
      sidebarGroupId: managementGroup.id,
    },
    create: {
      label: "Users",
      href: "/admin/users",
      icon: "users",
      position: 0,
      isActive: true,
      sidebarGroupId: managementGroup.id,
    },
  });
  await prisma.sidebarItemAccess.upsert({
    where: {
      roleId_sidebarItemId: {
        roleId: superAdminRole.id,
        sidebarItemId: usersItem.id,
      },
    },
    update: { hasAccess: true },
    create: {
      roleId: superAdminRole.id,
      sidebarItemId: usersItem.id,
      hasAccess: true,
    },
  });

  const rolesItem = await prisma.sidebarItem.upsert({
    where: { href: "/admin/roles" },
    update: {
      label: "Roles",
      icon: "shield",
      sidebarGroupId: managementGroup.id,
    },
    create: {
      label: "Roles",
      href: "/admin/roles",
      icon: "shield",
      position: 1,
      isActive: true,
      sidebarGroupId: managementGroup.id,
    },
  });
  await prisma.sidebarItemAccess.upsert({
    where: {
      roleId_sidebarItemId: {
        roleId: superAdminRole.id,
        sidebarItemId: rolesItem.id,
      },
    },
    update: { hasAccess: true },
    create: {
      roleId: superAdminRole.id,
      sidebarItemId: rolesItem.id,
      hasAccess: true,
    },
  });

  const settingsItem = await prisma.sidebarItem.upsert({
    where: { href: "/admin/site-settings" },
    update: {
      label: "Settings",
      icon: "settings",
      sidebarGroupId: managementGroup.id,
    },
    create: {
      label: "Settings",
      href: "/admin/site-settings",
      icon: "settings",
      position: 2,
      isActive: true,
      sidebarGroupId: managementGroup.id,
    },
  });
  await prisma.sidebarItemAccess.upsert({
    where: {
      roleId_sidebarItemId: {
        roleId: superAdminRole.id,
        sidebarItemId: settingsItem.id,
      },
    },
    update: { hasAccess: true },
    create: {
      roleId: superAdminRole.id,
      sidebarItemId: settingsItem.id,
      hasAccess: true,
    },
  });

  // Management -> Ideas
  const ideasItem = await prisma.sidebarItem.upsert({
    where: { href: "/admin/ideas" },
    update: {
      label: "Ideas",
      icon: "lightbulb",
      sidebarGroupId: managementGroup.id,
    },
    create: {
      label: "Ideas",
      href: "/admin/ideas",
      icon: "lightbulb",
      position: 3,
      isActive: true,
      sidebarGroupId: managementGroup.id,
    },
  });
  // grant access to SUPERADMIN and ADMIN
  for (const role of [superAdminRole, adminRole]) {
    await prisma.sidebarItemAccess.upsert({
      where: {
        roleId_sidebarItemId: {
          roleId: role.id,
          sidebarItemId: ideasItem.id,
        },
      },
      update: { hasAccess: true },
      create: { roleId: role.id, sidebarItemId: ideasItem.id, hasAccess: true },
    });
  }

  const reportsGroup = await prisma.sidebarGroup.upsert({
    where: { title: "Reports" },
    update: {},
    create: { title: "Reports", position: 1, isActive: true },
  });
  for (const role of [adminRole, superAdminRole]) {
    await prisma.sidebarGroupAccess.upsert({
      where: {
        roleId_sidebarGroupId: {
          roleId: role.id,
          sidebarGroupId: reportsGroup.id,
        },
      },
      update: { hasAccess: true },
      create: { roleId: role.id, sidebarGroupId: reportsGroup.id, hasAccess: true },
    });
  }

  const reportItems = [
    {
      label: "Audit Logs",
      href: "/admin/audit-logs",
      icon: "activity",
      position: 0,
    },
    {
      label: "Google Analytics",
      href: "/admin/google-analytics",
      icon: "barChart3",
      position: 1,
    },
  ];

  for (const item of reportItems) {
    const existing = await prisma.sidebarItem.upsert({
      where: { href: item.href },
      update: {
        label: item.label,
        icon: item.icon,
        position: item.position,
        sidebarGroupId: reportsGroup.id,
      },
      create: {
        label: item.label,
        href: item.href,
        icon: item.icon,
        position: item.position,
        isActive: true,
        sidebarGroupId: reportsGroup.id,
      },
    });
    for (const role of [adminRole, superAdminRole]) {
      await prisma.sidebarItemAccess.upsert({
        where: {
          roleId_sidebarItemId: {
            roleId: role.id,
            sidebarItemId: existing.id,
          },
        },
        update: { hasAccess: true },
        create: {
          roleId: role.id,
          sidebarItemId: existing.id,
          hasAccess: true,
        },
      });
    }
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
