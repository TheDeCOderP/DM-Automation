import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform } from "@prisma/client";

const BEST_TIMES: Record<string, { hour: number; minute: number }> = {
  LINKEDIN: { hour: 10, minute: 0 },
  TWITTER: { hour: 12, minute: 0 },
  INSTAGRAM: { hour: 11, minute: 0 },
  FACEBOOK: { hour: 13, minute: 0 },
  YOUTUBE: { hour: 14, minute: 0 },
  PINTEREST: { hour: 20, minute: 0 },
  REDDIT: { hour: 9, minute: 0 },
  TIKTOK: { hour: 19, minute: 0 },
};

function recalculateSuggestedTime(day: number, platform: string, startDate: Date): Date {
  const time = BEST_TIMES[platform] || { hour: 10, minute: 0 };
  const date = new Date(startDate);
  date.setDate(date.getDate() + (day - 1));
  date.setHours(time.hour, time.minute, 0, 0);
  return date;
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin only
  if (!["Admin", "SuperAdmin"].includes(token.role as string)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // Fetch all calendars that have a startDate, with their items
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

    let updated = 0;
    let skipped = 0;

    for (const calendar of calendars) {
      if (!calendar.startDate) { skipped++; continue; }

      const platforms = calendar.platforms as string[];
      const platform = platforms?.[0] ?? "LINKEDIN";

      for (const item of calendar.items) {
        const correct = recalculateSuggestedTime(item.day, platform, calendar.startDate);

        // Only update if the date is actually wrong (differs by more than 1 minute)
        const current = item.suggestedTime ? new Date(item.suggestedTime) : null;
        const diff = current ? Math.abs(correct.getTime() - current.getTime()) : Infinity;

        if (diff > 60_000) {
          await prisma.contentCalendarItem.update({
            where: { id: item.id },
            data: { suggestedTime: correct },
          });
          updated++;
        } else {
          skipped++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${updated} calendar items. Skipped ${skipped} (already correct or no startDate).`,
      updated,
      skipped,
    });
  } catch (error) {
    console.error("[FIX-CALENDAR-DATES]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
