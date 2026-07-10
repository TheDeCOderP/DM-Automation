import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const start = new Date('2026-06-01T00:00:00.000Z');
const end   = new Date('2026-07-01T00:00:00.000Z');

const failed = await prisma.post.findMany({
  where: { scheduledAt: { gte: start, lt: end }, status: 'FAILED' },
  include: {
    brand: { select: { id: true, name: true } },
    socialAccount: { select: { id: true, platform: true, platformUsername: true } },
    socialAccountPage: { select: { id: true, name: true, platform: true } },
  },
  orderBy: { scheduledAt: 'asc' },
});

console.log(`\nTotal FAILED posts in June 2026: ${failed.length}\n`);

// Group by platform
const byPlatform = {};
const byBrand = {};
const errors = [];

for (const post of failed) {
  const platform = post.platform;
  byPlatform[platform] = (byPlatform[platform] || 0) + 1;

  const brandName = post.brand?.name || 'Unknown';
  byBrand[brandName] = (byBrand[brandName] || 0) + 1;

  // Check platformMetadata for error info
  const meta = post.platformMetadata;
  if (meta && typeof meta === 'object') {
    const errorMsg = meta.error || meta.errorMessage || meta.failReason || meta.message || meta.errorCode || null;
    if (errorMsg) {
      errors.push({ id: post.id, platform, brand: brandName, scheduledAt: post.scheduledAt, error: errorMsg });
    }
  }
}

console.log('--- By Platform ---');
for (const [platform, count] of Object.entries(byPlatform)) {
  console.log(`  ${platform}: ${count}`);
}

console.log('\n--- By Brand ---');
for (const [brand, count] of Object.entries(byBrand)) {
  console.log(`  ${brand}: ${count}`);
}

console.log('\n--- Error Messages in platformMetadata ---');
if (errors.length === 0) {
  console.log('  No error messages found in platformMetadata');
} else {
  for (const e of errors) {
    console.log(`  [${e.platform}] ${e.brand} | ${e.scheduledAt?.toISOString()} | ${JSON.stringify(e.error)}`);
  }
}

// Print full platformMetadata for first 5 failed posts
console.log('\n--- Full platformMetadata (first 10 posts) ---');
for (const post of failed.slice(0, 10)) {
  console.log(`\nPost ID: ${post.id}`);
  console.log(`  Platform:    ${post.platform}`);
  console.log(`  Brand:       ${post.brand?.name}`);
  console.log(`  ScheduledAt: ${post.scheduledAt}`);
  console.log(`  SocialAcc:   ${post.socialAccount?.platformUsername || 'null'} (${post.socialAccount?.platform || '-'})`);
  console.log(`  Page:        ${post.socialAccountPage?.name || 'null'}`);
  console.log(`  Metadata:    ${JSON.stringify(post.platformMetadata, null, 2)}`);
}

await prisma.$disconnect();
