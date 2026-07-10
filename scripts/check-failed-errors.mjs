import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const start = new Date('2026-06-01T00:00:00.000Z');
const end   = new Date('2026-07-01T00:00:00.000Z');

// Get failed post IDs from June 2026
const failedPosts = await prisma.post.findMany({
  where: { scheduledAt: { gte: start, lt: end }, status: 'FAILED' },
  select: { id: true, platform: true, scheduledAt: true, brand: { select: { name: true } } },
});

const postIds = failedPosts.map(p => p.id);
console.log(`\nFailed posts in June 2026: ${postIds.length}\n`);

// Get POST_FAILED notifications for these posts
const notifications = await prisma.notification.findMany({
  where: {
    type: 'POST_FAILED',
    createdAt: { gte: start, lt: end },
  },
  orderBy: { createdAt: 'asc' },
});

console.log(`POST_FAILED notifications found: ${notifications.length}`);

// Group errors
const errorCounts = {};
const errorSamples = {};

for (const notif of notifications) {
  const meta = notif.metadata;
  const error = (meta && typeof meta === 'object')
    ? (meta.error || 'No error field')
    : 'No metadata';

  // Shorten very long errors to first 200 chars
  const shortError = String(error).slice(0, 200);
  errorCounts[shortError] = (errorCounts[shortError] || 0) + 1;
  if (!errorSamples[shortError]) {
    errorSamples[shortError] = {
      postId: meta?.postId,
      platform: meta?.platform,
      notifDate: notif.createdAt,
    };
  }
}

console.log('\n=== Unique Errors & Counts ===');
for (const [err, count] of Object.entries(errorCounts)) {
  const sample = errorSamples[err];
  console.log(`\n[${count}x] ${err}`);
  console.log(`  Platform: ${sample.platform} | PostId: ${sample.postId}`);
  console.log(`  First seen: ${sample.notifDate}`);
}

// Also check LinkedIn service for context
await prisma.$disconnect();
