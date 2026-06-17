const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('Now UTC:', now.toISOString());

  // Check the Day 1 post scheduled for 07:45 UTC (1:15 PM IST)
  const posts = await prisma.post.findMany({
    where: {
      platform: 'LINKEDIN',
      scheduledAt: {
        gte: new Date('2026-06-17T07:00:00Z'),
        lte: new Date('2026-06-17T09:00:00Z'),
      }
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      brand: { select: { name: true } },
      socialAccountPageId: true,
    }
  });

  console.log('\nPosts scheduled around 1:15 PM IST today:');
  posts.forEach(p => {
    console.log(`  id=${p.id} | status=${p.status} | scheduledAt=${p.scheduledAt.toISOString()} | brand=${p.brand?.name} | pageId=${p.socialAccountPageId}`);
  });

  // Also check content calendar item for Day 1 - SCHEDULED
  const calItem = await prisma.contentCalendarItem.findFirst({
    where: {
      day: 1,
      status: 'SCHEDULED',
      suggestedTime: {
        gte: new Date('2026-06-17T00:00:00Z'),
        lte: new Date('2026-06-17T23:59:59Z'),
      }
    },
    select: {
      id: true,
      day: true,
      status: true,
      suggestedTime: true,
      postGroupId: true,
      postGroup: {
        select: {
          id: true,
          cronJobId: true,
          posts: {
            select: { id: true, status: true, scheduledAt: true, platform: true }
          }
        }
      }
    }
  });

  console.log('\nContent Calendar Item Day 1 (today):');
  console.log(JSON.stringify(calItem, null, 2));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
