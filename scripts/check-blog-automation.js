const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBlogAutomation() {
  try {
    const now = new Date();
    console.log('=== Blog Automation Diagnostic ===\n');
    console.log(`Current time (local): ${now.toLocaleString()}`);
    console.log(`Current time (UTC):   ${now.toISOString()}\n`);

    // All SCHEDULED blog automations
    const scheduled = await prisma.blogAutomation.findMany({
      where: { status: 'SCHEDULED' },
      include: {
        dbConnection: { select: { id: true, name: true, dbType: true } },
        brand: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    console.log(`=== SCHEDULED Blog Automations: ${scheduled.length} ===\n`);
    scheduled.forEach((a, i) => {
      console.log(`--- [${i + 1}] ${a.title} ---`);
      console.log(`  ID:           ${a.id}`);
      console.log(`  Brand:        ${a.brand?.name || 'N/A'}`);
      console.log(`  DB Conn:      ${a.dbConnection?.name || 'NONE (required for publish!)'}`);
      console.log(`  scheduledAt:  ${a.scheduledAt?.toISOString() || 'NULL'}`);
      console.log(`  cronJobId:    ${a.cronJobId || 'NULL (NO CRON JOB REGISTERED!)'}`);
      if (a.scheduledAt && a.scheduledAt <= now) {
        const minsOverdue = Math.floor((now - a.scheduledAt) / 60000);
        console.log(`  ⚠️  OVERDUE by ${minsOverdue} minutes - should have been published!`);
      }
      console.log('');
    });

    // Overdue ones
    const overdue = await prisma.blogAutomation.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
        dbConnectionId: { not: null },
      },
      include: {
        dbConnection: { select: { id: true, name: true } },
        brand: { select: { name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    console.log(`=== Overdue & ready to publish: ${overdue.length} ===`);
    if (overdue.length > 0) {
      overdue.forEach(a => {
        const minsOverdue = Math.floor((now - a.scheduledAt) / 60000);
        console.log(`  - [${a.id}] "${a.title}" → overdue by ${minsOverdue} min, DB: ${a.dbConnection?.name}`);
      });
      console.log('\n👉 Run the cron endpoint manually to publish these now.');
    }

    // Recent PUBLISHED
    const recentPublished = await prisma.blogAutomation.findMany({
      where: { status: 'PUBLISHED' },
      include: { brand: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 5,
    });

    console.log(`\n=== Recently PUBLISHED Blog Automations (last 5) ===`);
    if (recentPublished.length === 0) {
      console.log('  None published yet.');
    }
    recentPublished.forEach(a => {
      console.log(`  - "${a.title}" published at ${a.publishedAt?.toISOString()}`);
    });

    // Recent FAILED
    const recentFailed = await prisma.blogAutomation.findMany({
      where: { status: 'FAILED' },
      include: { brand: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    console.log(`\n=== Recently FAILED Blog Automations (last 5) ===`);
    if (recentFailed.length === 0) {
      console.log('  None failed.');
    }
    recentFailed.forEach(a => {
      console.log(`  - "${a.title}" — error: ${a.errorMessage}`);
    });

    console.log('\n=== Root Cause ===');
    console.log('Social media scheduling creates a cron-job.org job that calls /api/cron-jobs/publish-post.');
    console.log('Blog automation scheduling does NOT create any cron job — cronJobId is always NULL.');
    console.log('So the /api/cron-jobs/publish-blogs endpoint is never called automatically.');
    console.log('\n✅ Fix: The blog automation POST/PUT should register a cron-job.org job like social media does.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBlogAutomation();
