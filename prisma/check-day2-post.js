const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDay2Post() {
  try {
    console.log('\n╔' + '═'.repeat(78) + '╗');
    console.log('║' + ' '.repeat(25) + 'CHECKING DAY 2 POST' + ' '.repeat(34) + '║');
    console.log('╚' + '═'.repeat(78) + '╝\n');

    const now = new Date();
    console.log('Current Time:');
    console.log(`  UTC:   ${now.toISOString()}`);
    console.log(`  Local: ${now.toString()}`);
    console.log();

    // Find the Day 2 post - "3 Tips to Rank on ChatGPT and Perplexity"
    const post = await prisma.contentCalendarItem.findFirst({
      where: {
        day: 2,
        topic: {
          contains: '3 Tips'
        }
      },
      include: {
        calendar: {
          select: {
            topic: true,
            brand: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!post) {
      console.log('❌ Day 2 post not found in ContentCalendarItem table');
      console.log('Searching in Post table instead...\n');
      
      const regularPost = await prisma.post.findFirst({
        where: {
          title: {
            contains: '3 Tips to Rank on ChatGPT'
          }
        },
        include: {
          brand: {
            select: {
              name: true
            }
          }
        }
      });

      if (regularPost) {
        console.log('Found in Post table:');
        console.log(`  ID: ${regularPost.id}`);
        console.log(`  Title: ${regularPost.title}`);
        console.log(`  Brand: ${regularPost.brand.name}`);
        console.log(`  Status: ${regularPost.status}`);
        console.log();
        
        if (regularPost.scheduledAt) {
          const scheduledDate = new Date(regularPost.scheduledAt);
          console.log('Scheduled Time (from DB):');
          console.log(`  Raw value: ${regularPost.scheduledAt}`);
          console.log(`  Parsed UTC: ${scheduledDate.toISOString()}`);
          console.log(`  UK Time: ${scheduledDate.toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium', timeStyle: 'long' })}`);
          console.log(`  India Time: ${scheduledDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long' })}`);
          console.log();

          const timeDiff = scheduledDate - now;
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          console.log('Status:');
          if (hoursDiff > 0) {
            console.log(`  ✓ Scheduled ${hoursDiff.toFixed(2)} hours in the FUTURE`);
            console.log(`  ✓ NOT overdue`);
          } else {
            console.log(`  ✗ ${Math.abs(hoursDiff).toFixed(2)} hours OVERDUE`);
          }
        }
      } else {
        console.log('❌ Post not found in either table');
      }
      
      await prisma.$disconnect();
      return;
    }

    console.log('Found Day 2 Calendar Item:');
    console.log(`  ID: ${post.id}`);
    console.log(`  Day: ${post.day}`);
    console.log(`  Topic: ${post.topic}`);
    console.log(`  Calendar: ${post.calendar.topic}`);
    console.log(`  Brand: ${post.calendar.brand.name}`);
    console.log(`  Status: ${post.status}`);
    console.log();

    if (post.suggestedTime) {
      const suggestedDate = new Date(post.suggestedTime);
      console.log('Suggested Time (from DB):');
      console.log(`  Raw value: ${post.suggestedTime}`);
      console.log(`  Type: ${typeof post.suggestedTime}`);
      console.log(`  Parsed UTC: ${suggestedDate.toISOString()}`);
      console.log();
      
      console.log('Display Times (what formatDateTimeUKIndia should show):');
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const indiaFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      console.log(`  UK: ${ukFormatter.format(suggestedDate)}`);
      console.log(`  India: ${indiaFormatter.format(suggestedDate)}`);
      console.log();

      console.log('What UI is showing (from screenshot):');
      console.log('  UK: ca 07 Apr 2026, 05:30');
      console.log('  India: in 07 Apr 2026, 10:00');
      console.log();

      const timeDiff = suggestedDate - now;
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      console.log('Status:');
      if (hoursDiff > 0) {
        console.log(`  ✓ Scheduled ${hoursDiff.toFixed(2)} hours in the FUTURE`);
        console.log(`  ✓ NOT overdue`);
      } else {
        console.log(`  ✗ ${Math.abs(hoursDiff).toFixed(2)} hours OVERDUE`);
      }
      console.log();

      console.log('🔍 DIAGNOSIS:');
      console.log('─'.repeat(80));
      if (ukFormatter.format(suggestedDate).includes('07 Apr') && ukFormatter.format(suggestedDate).includes('05:30')) {
        console.log('❌ The database has INCORRECT data!');
        console.log('   The suggestedTime was saved incorrectly before the fix.');
        console.log('   You need to re-edit this post and save it again.');
      } else {
        console.log('✓ The database has CORRECT data!');
        console.log('  The issue might be with browser cache or the page needs refresh.');
      }
    } else {
      console.log('⚠️  No suggested time set for this item');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDay2Post();
