const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSpecificPost() {
  try {
    console.log('='.repeat(80));
    console.log('CHECKING SPECIFIC POST FROM SCREENSHOT (Day 2)');
    console.log('='.repeat(80));
    console.log();

    // Get current time
    const now = new Date();
    console.log('Current Server Time (UTC):', now.toISOString());
    console.log('Current Server Time (IST):', now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Current Server Time (UK):', now.toLocaleString('en-GB', { timeZone: 'Europe/London' }));
    console.log();

    // Find the post with title "3 Tips to Rank on ChatGPT and Perplexity"
    const post = await prisma.post.findFirst({
      where: {
        title: {
          contains: '3 Tips to Rank on ChatGPT and Perplexity'
        }
      },
      include: {
        user: true,
        brand: true
      }
    });

    if (!post) {
      console.log('Post not found!');
      return;
    }

    console.log('POST DETAILS:');
    console.log('='.repeat(80));
    console.log(`ID: ${post.id}`);
    console.log(`Title: ${post.title}`);
    console.log(`Status: ${post.status}`);
    console.log(`Brand: ${post.brand.name}`);
    console.log();

    if (post.scheduledAt) {
      const scheduledDate = new Date(post.scheduledAt);
      
      console.log('SCHEDULED TIME ANALYSIS:');
      console.log('='.repeat(80));
      console.log(`Stored in DB (UTC): ${scheduledDate.toISOString()}`);
      console.log(`Stored in DB (IST): ${scheduledDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' })}`);
      console.log(`Stored in DB (UK): ${scheduledDate.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'full', timeStyle: 'long' })}`);
      console.log();

      // Check what the UI is showing
      console.log('UI DISPLAY (from screenshot):');
      console.log('  UK / India');
      console.log('  ca 07 Apr 2026, 05:30');
      console.log('  in 07 Apr 2026, 10:00');
      console.log();

      // Calculate time difference
      const timeDiff = scheduledDate - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const minutesDiff = timeDiff / (1000 * 60);
      
      console.log('TIME DIFFERENCE:');
      console.log('='.repeat(80));
      if (timeDiff < 0) {
        console.log(`⚠️  OVERDUE by ${Math.abs(hoursDiff).toFixed(2)} hours (${Math.abs(minutesDiff).toFixed(2)} minutes)`);
        console.log(`⚠️  Scheduled time has passed!`);
      } else {
        console.log(`✓ Scheduled in ${hoursDiff.toFixed(2)} hours (${minutesDiff.toFixed(2)} minutes)`);
      }
      console.log();

      // Check if the UI is interpreting the time incorrectly
      console.log('POSSIBLE ISSUE ANALYSIS:');
      console.log('='.repeat(80));
      
      // If UI shows 05:30 UK time, that should be:
      const expectedUKTime = new Date('2026-04-07T05:30:00+01:00'); // BST
      console.log(`If UI expects 05:30 UK time (BST):`);
      console.log(`  - Should be stored as UTC: ${expectedUKTime.toISOString()}`);
      console.log(`  - Currently stored as UTC: ${scheduledDate.toISOString()}`);
      console.log(`  - Match: ${expectedUKTime.toISOString() === scheduledDate.toISOString() ? '✓ YES' : '✗ NO'}`);
      console.log();

      // If UI shows 10:00 India time, that should be:
      const expectedIndiaTime = new Date('2026-04-07T10:00:00+05:30'); // IST
      console.log(`If UI expects 10:00 India time (IST):`);
      console.log(`  - Should be stored as UTC: ${expectedIndiaTime.toISOString()}`);
      console.log(`  - Currently stored as UTC: ${scheduledDate.toISOString()}`);
      console.log(`  - Match: ${expectedIndiaTime.toISOString() === scheduledDate.toISOString() ? '✓ YES' : '✗ NO'}`);
      console.log();

      // Check what 10:00 UTC means in different timezones
      console.log('WHAT DOES 10:00 UTC MEAN IN DIFFERENT TIMEZONES:');
      console.log('='.repeat(80));
      const utc10 = new Date('2026-04-08T10:00:00.000Z');
      console.log(`UTC: ${utc10.toISOString()}`);
      console.log(`UK Time: ${utc10.toLocaleString('en-GB', { timeZone: 'Europe/London', hour12: false })}`);
      console.log(`India Time: ${utc10.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })}`);
      console.log();

      // Check if the UI is showing the wrong timezone
      console.log('DIAGNOSIS:');
      console.log('='.repeat(80));
      console.log('The post is scheduled for 08 Apr 2026, 10:00 UTC');
      console.log('Which is:');
      console.log('  - 11:00 BST (UK time)');
      console.log('  - 15:30 IST (India time)');
      console.log();
      console.log('But the UI is showing:');
      console.log('  - 05:30 UK time');
      console.log('  - 10:00 India time');
      console.log();
      console.log('This suggests the UI might be:');
      console.log('  1. Not converting UTC to local timezone correctly');
      console.log('  2. Displaying UTC time as if it were local time');
      console.log('  3. Using wrong timezone offset');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecificPost();
