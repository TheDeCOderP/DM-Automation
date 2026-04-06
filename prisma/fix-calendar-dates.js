const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BEST_TIMES = {
  LINKEDIN: { hour: 10, minute: 0 },
  TWITTER: { hour: 12, minute: 0 },
  INSTAGRAM: { hour: 11, minute: 0 },
  FACEBOOK: { hour: 13, minute: 0 },
  YOUTUBE: { hour: 14, minute: 0 },
  PINTEREST: { hour: 20, minute: 0 },
  REDDIT: { hour: 9, minute: 0 },
  TIKTOK: { hour: 19, minute: 0 },
};

function recalculateSuggestedTime(day, platform, startDate) {
  const time = BEST_TIMES[platform] || { hour: 10, minute: 0 };
  const date = new Date(startDate);
  date.setDate(date.getDate() + (day - 1));
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

async function main() {
  const calendars = await prisma.contentCalendar.findMany({
    where: { startDate: { not: null } },
    select: {
      id: true,
      startDate: true,
      platforms: true,
      items: {
        select: { id: true, day: true, suggestedTime: true },
      },
    },
  });

  console.log(`Found ${calendars.length} calendars to process...`);

  let updated = 0;
  let skipped = 0;

  for (const calendar of calendars) {
    if (!calendar.startDate) { skipped++; continue; }

    const platforms = calendar.platforms;
    const platform = Array.isArray(platforms) && platforms.length > 0
      ? platforms[0]
      : "LINKEDIN";

    for (const item of calendar.items) {
      const correct = recalculateSuggestedTime(item.day, platform, calendar.startDate);
      const current = item.suggestedTime ? new Date(item.suggestedTime) : null;
      const diff = current ? Math.abs(correct.getTime() - current.getTime()) : Infinity;

      if (diff > 60_000) {
        await prisma.contentCalendarItem.update({
          where: { id: item.id },
          data: { suggestedTime: correct },
        });
        console.log(`  ✅ Calendar ${calendar.id} | Day ${item.day} | ${current?.toISOString() ?? "null"} → ${correct.toISOString()}`);
        updated++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
