/**
 * Fix the Prabisha failed posts:
 * - Posts are FAILED because LinkedIn token was expired when cron ran
 * - cronJobId = null so cron won't retry them automatically
 * - Token is now renewed (Aug 2026 expiry) so we just need to:
 *   1. Reset status to SCHEDULED
 *   2. Keep scheduledAt as is (1 PM IST = 07:30 UTC per day)
 *   3. Manually trigger publish for today's overdue post
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log('Now UTC:', now.toISOString());

  // Get all FAILED LinkedIn posts that were scheduled in June 2026
  const failedPosts = await prisma.post.findMany({
    where: {
      platform: 'LINKEDIN',
      status: 'FAILED',
      scheduledAt: {
        gte: new Date('2026-06-17T00:00:00Z'),
        lte: new Date('2026-06-30T23:59:59Z'),
      }
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      brand: { select: { name: true } },
      socialAccountPageId: true,
    },
    orderBy: { scheduledAt: 'asc' }
  });

  console.log(`\nFound ${failedPosts.length} failed LinkedIn posts to fix:`);
  failedPosts.forEach(p => {
    const ist = new Date(p.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const isOverdue = p.scheduledAt <= now;
    console.log(`  ${p.id} | ${ist} IST | ${p.brand?.name} | ${isOverdue ? '⚠️ OVERDUE' : '⏰ future'}`);
  });

  if (failedPosts.length === 0) {
    console.log('Nothing to fix!');
    return;
  }

  // Separate overdue vs future
  const overduePosts = failedPosts.filter(p => p.scheduledAt <= now);
  const futurePosts = failedPosts.filter(p => p.scheduledAt > now);

  console.log(`\nOverdue: ${overduePosts.length}, Future: ${futurePosts.length}`);

  // Reset ALL failed posts back to SCHEDULED
  const result = await prisma.post.updateMany({
    where: {
      id: { in: failedPosts.map(p => p.id) }
    },
    data: {
      status: 'SCHEDULED',
      updatedAt: new Date(),
    }
  });

  console.log(`\n✅ Reset ${result.count} posts to SCHEDULED`);

  // For overdue posts — also reset their content calendar item status so
  // the calendar detail page shows them correctly
  if (overduePosts.length > 0) {
    const overduePg = await prisma.post.findMany({
      where: { id: { in: overduePosts.map(p => p.id) } },
      select: { postGroupId: true }
    });
    const pgIds = [...new Set(overduePg.map(p => p.postGroupId).filter(Boolean))];

    if (pgIds.length > 0) {
      // Reset calendar items linked to these post groups back to SCHEDULED
      await prisma.contentCalendarItem.updateMany({
        where: { postGroupId: { in: pgIds } },
        data: { status: 'SCHEDULED' }
      });
      console.log(`✅ Reset ${pgIds.length} calendar items back to SCHEDULED`);
    }
  }

  // Verify
  const check = await prisma.post.findMany({
    where: { id: { in: failedPosts.map(p => p.id) } },
    select: { id: true, status: true, scheduledAt: true }
  });

  console.log('\n===== FINAL STATUS =====');
  check.forEach(p => {
    const ist = new Date(p.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    console.log(`  ${p.id} | ${p.status} | ${ist} IST`);
  });

  console.log('\n⚡ Overdue posts will now be picked up by the next cron run OR you can manually trigger:');
  console.log('   POST /api/posts/publish-overdue  (with Authorization header)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
