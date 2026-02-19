const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Knowledge Base sidebar link...");

  // Get the Configuration group
  const configGroup = await prisma.sidebarGroup.findUnique({
    where: { title: "Configuration" },
  });

  if (!configGroup) {
    console.error("❌ Configuration group not found. Please run main seed first.");
    process.exit(1);
  }

  // Get roles that should have access (User, BrandAdmin, BrandUser)
  const roles = await prisma.role.findMany({
    where: {
      name: {
        in: ["User", "BrandAdmin", "BrandUser"],
      },
    },
  });

  if (roles.length === 0) {
    console.error("❌ No roles found. Please run main seed first.");
    process.exit(1);
  }

  // Create or update Knowledge Base sidebar item
  const knowledgeBaseItem = await prisma.sidebarItem.upsert({
    where: { href: "/knowledge-base" },
    update: {
      label: "Knowledge Base",
      icon: "bookOpen",
      sidebarGroupId: configGroup.id,
    },
    create: {
      label: "Knowledge Base",
      href: "/knowledge-base",
      icon: "bookOpen",
      position: 1,
      isActive: true,
      sidebarGroupId: configGroup.id,
    },
  });

  console.log(`✅ Created/Updated Knowledge Base sidebar item (ID: ${knowledgeBaseItem.id})`);

  // Grant access to all specified roles
  for (const role of roles) {
    await prisma.sidebarItemAccess.upsert({
      where: {
        roleId_sidebarItemId: {
          roleId: role.id,
          sidebarItemId: knowledgeBaseItem.id,
        },
      },
      update: { hasAccess: true },
      create: {
        roleId: role.id,
        sidebarItemId: knowledgeBaseItem.id,
        hasAccess: true,
      },
    });
    console.log(`✅ Granted access to role: ${role.name}`);
  }

  console.log("✅ Knowledge Base sidebar link seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding Knowledge Base link:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
