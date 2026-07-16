// src/app/api/content-calendar/overview/route.ts
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/content-calendar/overview
 *
 * Returns calendar stats for ALL brands the user has access to in a single DB call.
 * Replaces the N fan-out fetches to /api/content-calendar?brandId=X in the list view.
 *
 * Response shape:
 * {
 *   overview: {
 *     [brandId]: {
 *       total: number
 *       draft: number
 *       scheduled: number
 *       completed: number
 *       totalItems: number
 *       itemsWithImages: number
 *       calendars: { id, topic, duration, platforms, postsPerWeek, status, startDate, endDate, createdAt, itemCount, imageCount }[]
 *     }
 *   }
 * }
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all brand IDs this user has access to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: token.id as string },
      select: { brandId: true },
    });

    const brandIds = userBrands.map((ub) => ub.brandId);

    if (brandIds.length === 0) {
      return NextResponse.json({ overview: {} });
    }

    // 2. Fetch calendars for all brands in ONE query
    //    Only select the fields needed for the overview table — NOT captions/longtext
    const calendars = await prisma.contentCalendar.findMany({
      where: { brandId: { in: brandIds } },
      select: {
        id: true,
        brandId: true,
        topic: true,
        duration: true,
        platforms: true,
        postsPerWeek: true,
        status: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        // Only fetch id + imageUrl from items — no captions, no LongText
        items: {
          select: {
            id: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Group into per-brand stats
    const overview: Record<
      string,
      {
        total: number;
        draft: number;
        scheduled: number;
        completed: number;
        totalItems: number;
        itemsWithImages: number;
        calendars: {
          id: string;
          topic: string;
          duration: number;
          platforms: unknown;
          postsPerWeek: number;
          status: string;
          startDate: Date | null;
          endDate: Date | null;
          createdAt: Date;
          itemCount: number;
          imageCount: number;
        }[];
      }
    > = {};

    for (const cal of calendars) {
      if (!overview[cal.brandId]) {
        overview[cal.brandId] = {
          total: 0,
          draft: 0,
          scheduled: 0,
          completed: 0,
          totalItems: 0,
          itemsWithImages: 0,
          calendars: [],
        };
      }

      const entry = overview[cal.brandId];
      entry.total++;
      if (cal.status === "DRAFT") entry.draft++;
      else if (cal.status === "SCHEDULED") entry.scheduled++;
      else if (cal.status === "COMPLETED") entry.completed++;

      const itemCount = cal.items.length;
      const imageCount = cal.items.filter((i) => !!i.imageUrl).length;

      entry.totalItems += itemCount;
      entry.itemsWithImages += imageCount;

      entry.calendars.push({
        id: cal.id,
        topic: cal.topic,
        duration: cal.duration,
        platforms: cal.platforms,
        postsPerWeek: cal.postsPerWeek,
        status: cal.status,
        startDate: cal.startDate,
        endDate: cal.endDate,
        createdAt: cal.createdAt,
        itemCount,
        imageCount,
      });
    }

    return NextResponse.json({ overview });
  } catch (error) {
    console.error("[CALENDAR-OVERVIEW] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar overview" },
      { status: 500 }
    );
  }
}
