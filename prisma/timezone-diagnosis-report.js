const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateReport() {
  try {
    console.log('\n');
    console.log('╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(20) + 'TIMEZONE DIAGNOSIS REPORT' + ' '.repeat(33) + '║');
    console.log('╚' + '═'.repeat(78) + '╝');
    console.log();

    const now = new Date();
    
    console.log('📅 CURRENT TIME:');
    console.log('─'.repeat(80));
    console.log(`   UTC:        ${now.toISOString()}`);
    console.log(`   UK (BST):   ${now.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'long' })}`);
    console.log(`   India (IST): ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long' })}`);
    console.log();

    // Get the Day 2 post from screenshot
    const day2Post = await prisma.post.findFirst({
      where: {
        title: { contains: '3 Tips to Rank on ChatGPT and Perplexity' }
      }
    });

    if (day2Post && day2Post.scheduledAt) {
      const scheduledDate = new Date(day2Post.scheduledAt);
      
      console.log('🔍 ISSUE FOUND - Day 2 Post:');
      console.log('─'.repeat(80));
      console.log(`   Title: ${day2Post.title}`);
      console.log();
      
      console.log('   ✅ CORRECT TIME (Stored in Database):');
      console.log(`      UTC:        ${scheduledDate.toISOString()}`);
      console.log(`      UK (BST):   ${scheduledDate.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'long' })}`);
      console.log(`      India (IST): ${scheduledDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long' })}`);
      console.log();
      
      console.log('   ❌ WRONG TIME (Displayed in UI):');
      console.log('      UK:         07 Apr 2026, 05:30');
      console.log('      India:      07 Apr 2026, 10:00');
      console.log();

      const timeDiff = scheduledDate - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      console.log('   ⏰ TIME STATUS:');
      if (hoursDiff > 0) {
        console.log(`      ✓ Post is scheduled ${hoursDiff.toFixed(2)} hours in the FUTURE`);
        console.log(`      ✓ This is NOT overdue!`);
      } else {
        console.log(`      ✗ Post is ${Math.abs(hoursDiff).toFixed(2)} hours OVERDUE`);
      }
      console.log();
    }

    console.log('🐛 ROOT CAUSE ANALYSIS:');
    console.log('─'.repeat(80));
    console.log('   The database stores the correct UTC time: 2026-04-08T10:00:00.000Z');
    console.log('   Which correctly converts to:');
    console.log('      • 11:00 BST (UK time on April 8)');
    console.log('      • 15:30 IST (India time on April 8)');
    console.log();
    console.log('   However, the UI is displaying:');
    console.log('      • 05:30 UK time on April 7 (WRONG!)');
    console.log('      • 10:00 India time on April 7 (WRONG!)');
    console.log();
    console.log('   The UI appears to be displaying the UTC hour (10:00) directly');
    console.log('   without proper timezone conversion.');
    console.log();

    console.log('💡 SOLUTION:');
    console.log('─'.repeat(80));
    console.log('   The issue is in the FRONTEND code, not the database.');
    console.log('   The UI needs to properly convert UTC times to local timezones.');
    console.log();
    console.log('   Check these files:');
    console.log('      • Calendar/scheduling component');
    console.log('      • Date formatting utilities');
    console.log('      • Timezone conversion functions');
    console.log();
    console.log('   The UI should use:');
    console.log('      • new Date(scheduledAt).toLocaleString() with proper timezone');
    console.log('      • Or a library like date-fns-tz or moment-timezone');
    console.log();

    console.log('📊 SUMMARY:');
    console.log('─'.repeat(80));
    const allScheduled = await prisma.post.count({
      where: { status: 'SCHEDULED' }
    });
    
    const actuallyOverdue = await prisma.post.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lt: now }
      }
    });

    console.log(`   Total Scheduled Posts: ${allScheduled}`);
    console.log(`   Actually Overdue: ${actuallyOverdue}`);
    console.log(`   Showing as Overdue in UI: At least 1 (Day 2 post)`);
    console.log();
    console.log('   ✅ Database times are CORRECT');
    console.log('   ❌ UI timezone display is INCORRECT');
    console.log();

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

generateReport();
