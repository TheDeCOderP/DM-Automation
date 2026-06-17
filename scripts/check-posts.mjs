import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const months = [
  { label: 'May 2026',  start: new Date('2026-05-01T00:00:00.000Z'), end: new Date('2026-06-01T00:00:00.000Z') },
  { label: 'June 2026', start: new Date('2026-06-01T00:00:00.000Z'), end: new Date('2026-07-01T00:00:00.000Z') },
];

for (const month of months) {
  const [scheduled, failed, published, drafted, total] = await Promise.all([
    prisma.post.count({ where: { scheduledAt: { gte: month.start, lt: month.end }, status: 'SCHEDULED' } }),
    prisma.post.count({ where: { scheduledAt: { gte: month.start, lt: month.end }, status: 'FAILED' } }),
    prisma.post.count({ where: { scheduledAt: { gte: month.start, lt: month.end }, status: 'PUBLISHED' } }),
    prisma.post.count({ where: { scheduledAt: { gte: month.start, lt: month.end }, status: 'DRAFTED' } }),
    prisma.post.count({ where: { scheduledAt: { gte: month.start, lt: month.end } } }),
  ]);

  console.log('');
  console.log('=== ' + month.label + ' ===');
  console.log('Total posts with scheduledAt: ' + total);
  console.log('  SCHEDULED (still pending): ' + scheduled);
  console.log('  PUBLISHED (success):       ' + published);
  console.log('  FAILED:                    ' + failed);
  console.log('  DRAFTED:                   ' + drafted);
}

// Cross-check by publishedAt
console.log('');
console.log('--- Cross-check by publishedAt ---');
for (const month of months) {
  const pub = await prisma.post.count({ where: { publishedAt: { gte: month.start, lt: month.end } } });
  console.log(month.label + ' published (by publishedAt): ' + pub);
}

await prisma.$disconnect();
