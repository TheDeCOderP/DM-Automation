/**
 * Force-publish overdue blog automations via the cron endpoint.
 *
 * Usage:
 *   node scripts/force-publish-blog.js           (uses SERVER_URL from env or localhost:3010)
 *   node scripts/force-publish-blog.js http://localhost:3000
 */

const { PrismaClient } = require('@prisma/client');
try { require('dotenv').config(); } catch { /* dotenv optional */ }

const prisma = new PrismaClient();

// Try localhost:3010 (VPS PM2 port) first, then 3000 (dev)
const SERVER_URL = process.argv[2] || process.env.NEXTAUTH_URL || 'http://localhost:3010';
const CRON_TOKEN = process.env.CRON_SECRET_TOKEN || 'gdfgvdfgfdbfdhgfbbfghfbfhfgbhffhffbdfgdfdffg';

async function run() {
  const now = new Date();
  console.log('=== Force-Publish Blog Automation ===\n');
  console.log(`Current time (local): ${now.toLocaleString()}`);
  console.log(`Current time (UTC):   ${now.toISOString()}\n`);

  // Find SCHEDULED blogs (including ones not yet overdue in UTC — timezone bug case)
  const scheduled = await prisma.blogAutomation.findMany({
    where: { status: 'SCHEDULED', dbConnectionId: { not: null } },
    include: { brand: { select: { name: true } }, dbConnection: { select: { name: true } } },
    orderBy: { scheduledAt: 'asc' },
  });

  if (scheduled.length === 0) {
    console.log('No SCHEDULED blog automations with a DB connection found.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${scheduled.length} SCHEDULED blog automation(s):\n`);
  scheduled.forEach((a, i) => {
    const minsFromNow = a.scheduledAt ? Math.round((a.scheduledAt - now) / 60000) : 0;
    console.log(`  [${i + 1}] "${a.title}"`);
    console.log(`       ID:          ${a.id}`);
    console.log(`       scheduledAt: ${a.scheduledAt?.toISOString() || 'NULL'} (${minsFromNow > 0 ? `in ${minsFromNow} min (still future - timezone bug!)` : `${Math.abs(minsFromNow)} min ago`})`);
    console.log(`       DB Conn:     ${a.dbConnection?.name}`);
    console.log(`       cronJobId:   ${a.cronJobId || 'NULL'}\n`);
  });

  // Move all SCHEDULED blogs' scheduledAt to 2 minutes ago so the cron endpoint picks them up
  console.log('→ Setting scheduledAt to 2 minutes ago so cron endpoint picks them up...');
  const pastTime = new Date(now.getTime() - 2 * 60 * 1000);

  for (const a of scheduled) {
    await prisma.blogAutomation.update({
      where: { id: a.id },
      data: { scheduledAt: pastTime },
    });
    console.log(`  ✓ Updated "${a.title}"`);
  }

  console.log(`\n→ Calling cron endpoint: ${SERVER_URL}/api/cron-jobs/publish-blogs\n`);

  try {
    const res = await fetch(`${SERVER_URL}/api/cron-jobs/publish-blogs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    console.log(`HTTP Status: ${res.status}\n`);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (res.ok && data.successCount > 0) {
      console.log(`\n✅ SUCCESS! Published ${data.successCount} blog(s).`);
    } else if (res.ok && data.processed === 0) {
      console.log('\n⚠️  Cron ran but found 0 posts to publish. Check DB connection or scheduledAt update.');
    } else if (!res.ok) {
      console.log('\n❌ Cron endpoint returned an error.');
      console.log('   Make sure the Next.js server is running and accessible at:', SERVER_URL);
      console.log('   Try: node scripts/force-publish-blog.js http://localhost:3000');
    }
  } catch (err) {
    console.error('\n❌ Could not reach the server:', err.message);
    console.log('\nThe scheduledAt has been updated to the past in the DB.');
    console.log('The VPS cron job will pick it up on its next run.');
    console.log('\nOr run manually on the VPS:');
    console.log(`  node scripts/force-publish-blog.js http://localhost:3010`);
  }

  await prisma.$disconnect();
}

run();
