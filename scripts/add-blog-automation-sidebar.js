/**
 * Run: node scripts/add-blog-automation-sidebar.js
 * Adds Blog Automation & DB Connections sidebar items under the Blogs group.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find the Blogs sidebar group
  let blogsGroup = await prisma.sidebarGroup.findFirst({
    where: { title: { contains: 'Blog' } },
    include: { items: { orderBy: { position: 'asc' } } },
  });

  if (!blogsGroup) {
    console.log('No Blogs group found — creating one...');
    blogsGroup = await prisma.sidebarGroup.create({
      data: { title: 'Blogs', position: 5, isActive: true },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  console.log(`Using sidebar group: "${blogsGroup.title}" (${blogsGroup.id})`);

  const existingHrefs = blogsGroup.items.map(i => i.href);
  const maxPos = blogsGroup.items.length > 0
    ? Math.max(...blogsGroup.items.map(i => i.position))
    : 0;

  const toAdd = [
    { label: 'Blog Posts', href: '/blogs', icon: 'FileText', position: maxPos + 1 },
    { label: 'Blog Automation', href: '/blogs/automation', icon: 'Bot', position: maxPos + 2 },
    { label: 'DB Connections', href: '/blogs/db-connections', icon: 'Database', position: maxPos + 3 },
    { label: 'Blog Sites', href: '/blogs/sites', icon: 'Globe', position: maxPos + 4 },
  ].filter(item => !existingHrefs.includes(item.href));

  if (toAdd.length === 0) {
    console.log('All sidebar items already exist. Nothing to add.');
    return;
  }

  for (const item of toAdd) {
    const created = await prisma.sidebarItem.create({
      data: { ...item, sidebarGroupId: blogsGroup.id, isActive: true },
    });
    console.log(`✓ Added: "${created.label}" → ${created.href}`);
  }

  console.log('\nDone! Restart your dev server to see the changes.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
