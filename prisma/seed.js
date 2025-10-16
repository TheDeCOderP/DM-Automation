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
  const [superAdminRole, adminRole, userRole, brandAdminRole, brandUserRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "SuperAdmin" },
      update: {},
      create: { id: "PCR-0001", name: "SuperAdmin" },
    }),
    prisma.role.upsert({
      where: { name: "ADMIN" },
      update: {},
      create: { id: "PCR-0002", name: "Admin" },
    }),
    prisma.role.upsert({
      where: { name: "USER" },
      update: {},
      create: { id: "PCR-0003", name: "User" },
    }),
    prisma.role.upsert({
      where: { name: "BrandAdmin" },
      update: {},
      create: { id: "PCR-0004", name: "BrandAdmin", description: "The one who creates a brand" },
    }),
    prisma.role.upsert({
      where: { name: "BrandUser" },
      update: {},
      create: { id: "PCR-0005", name: "BrandUser", description: "The one who works for a brand" },
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

  // ───────────────────────────────────────────────
  // Sidebar Groups & Items
  // ───────────────────────────────────────────────
  
  // Management Group
  const managementGroup = await prisma.sidebarGroup.upsert({
    where: { title: "Management" },
    update: {},
    create: { title: "Management", position: 0, isActive: true },
  });

  // Users item
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

  // Roles item
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

  // Settings item
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

  // Grant access to SUPERADMIN and ADMIN
  const superAdminAndAdmin = [superAdminRole, adminRole];
  for (const role of superAdminAndAdmin) {
    for (const item of [usersItem, rolesItem, settingsItem]) {
      await prisma.sidebarItemAccess.upsert({
        where: {
          roleId_sidebarItemId: {
            roleId: role.id,
            sidebarItemId: item.id,
          },
        },
        update: { hasAccess: true },
        create: { roleId: role.id, sidebarItemId: item.id, hasAccess: true },
      });
    }
  }

  // Reports Group
  const reportsGroup = await prisma.sidebarGroup.upsert({
    where: { title: "Reports" },
    update: {},
    create: { title: "Reports", position: 1, isActive: true },
  });
  for (const role of superAdminAndAdmin) {
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
    { label: "Audit Logs", href: "/admin/audit-logs", icon: "activity", position: 0 },
    { label: "Google Analytics", href: "/admin/google-analytics", icon: "barChart3", position: 1 },
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
    for (const role of superAdminAndAdmin) {
      await prisma.sidebarItemAccess.upsert({
        where: {
          roleId_sidebarItemId: {
            roleId: role.id,
            sidebarItemId: existing.id,
          },
        },
        update: { hasAccess: true },
        create: { roleId: role.id, sidebarItemId: existing.id, hasAccess: true },
      });
    }
  }

  // ───────────────────────────────────────────────
  // Sidebar Items for User, BrandAdmin, BrandUser
  // ───────────────────────────────────────────────
  const navigation = {
    main: [{ title: "Calendar", icon: "calendar", url: "/posts/calendar" }],
    configuration: [{ title: "Accounts", icon: "users", url: "/accounts" }],
    activity: [{ title: "Notifications", icon: "bell", url: "/notifications" }],
    management: [{ title: "Analytics", icon: "chartNoAxesCombined", url: "/analytics" }],
  };

  const rolesForNavigation = [userRole, brandAdminRole, brandUserRole];

  // Helpers
  async function ensureSidebarGroup(title, position) {
    return prisma.sidebarGroup.upsert({
      where: { title },
      update: {},
      create: { title, position, isActive: true },
    });
  }

  async function ensureSidebarItemForRoles(group, item, roles) {
    const sidebarItem = await prisma.sidebarItem.upsert({
      where: { href: item.url },
      update: {
        label: item.title,
        icon: item.icon,
        sidebarGroupId: group.id,
      },
      create: {
        label: item.title,
        href: item.url,
        icon: item.icon,
        position: 0,
        isActive: true,
        sidebarGroupId: group.id,
      },
    });

    for (const role of roles) {
      await prisma.sidebarItemAccess.upsert({
        where: {
          roleId_sidebarItemId: { roleId: role.id, sidebarItemId: sidebarItem.id },
        },
        update: { hasAccess: true },
        create: { roleId: role.id, sidebarItemId: sidebarItem.id, hasAccess: true },
      });
    }
  }

  let position = 10; // offset to avoid conflicts
  for (const [section, items] of Object.entries(navigation)) {
    const group = await ensureSidebarGroup(section.charAt(0).toUpperCase() + section.slice(1), position++);
    for (const item of items) {
      await ensureSidebarItemForRoles(group, item, rolesForNavigation);
    }
  }

  console.log("✅ Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
