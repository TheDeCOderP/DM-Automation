const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('Current UTC time:', now.toISOString());
  console.log('Current IST time:', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('');

  // Find the Day 1 overdue post from the screenshot
  // GB: 17 Jun 2026, 08:45 -> UTC: 08:45 (BST = UTC+1 in June, so 07:45 UTC)
  // IN: 17 Jun 2026, 13:15 -> UTC: 07:45 (IST = UTC+5:30, 13:15 - 5:30 = 07:45)
  const posts = await prisma.post.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
      platform: 'LINKEDIN',
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      platform: true,
      brand: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 10,
  });

  console.log('Overdue SCHEDULED LinkedIn posts:', posts.length);
  posts.forEach(p => {
    const ist = new Date(p.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`  id=${p.id} | brand=${p.brand?.name} | scheduled=${p.scheduledAt.toISOString()} | IST=${ist}`);
  });

  // Also check the content calendar items for the Prabisha brand to see date mismatch
  const calItems = await prisma.contentCalendarItem.findMany({
    where: {
      calendar: {
        brand: { name: { contains: 'Prabisha' } },
        status: 'SCHEDULED',
      }
    },
    select: {
      id: true,
      day: true,
      suggestedTime: true,
      status: true,
      calendar: { select: { topic: true, startDate: true } },
    },
    orderBy: { day: 'asc' },
    take: 14,
  });

  console.log('\nContent Calendar Items (Prabisha Scheduled):');
  calItems.forEach(i => {
    const ist = i.suggestedTime ? new Date(i.suggestedTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'null';
    const utc = i.suggestedTime ? new Date(i.suggestedTime).toISOString() : 'null';
    console.log(`  Day ${i.day} | status=${i.status} | IST=${ist} | UTC=${utc}`);
  });

  // Check how many minutes since now the first post was due
  if (posts.length > 0) {
    const firstPost = posts[0];
    const minsOverdue = Math.floor((now - firstPost.scheduledAt) / 60000);
    console.log(`\nFirst overdue post is ${minsOverdue} minutes overdue`);
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
