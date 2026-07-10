// app/api/dashboard/stats/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import {
  subDays,
  startOfDay,
  endOfDay,
  startOfYesterday,
  endOfYesterday,
} from "date-fns";

// ---------------------------------------------------------------------------
// Everything in this route is derived from real Prisma models EXCEPT:
//   - Campaigns / Leads Generated / AI Credits / Storage Usage
// There is no schema support for those yet (no Campaign, Lead, or Storage
// model), so the frontend keeps those specific cards as static placeholders
// per your call. Everything else below is 100% live.
// ---------------------------------------------------------------------------

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = token.id as string;
    const now = new Date();

    const last7Start = startOfDay(subDays(now, 6));
    const prev7Start = startOfDay(subDays(now, 13));
    const prev7End = startOfDay(subDays(now, 7));
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yestStart = startOfYesterday();
    const yestEnd = endOfYesterday();

    // Brands the user belongs to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId },
      select: { brandId: true },
    });
    const brandIds = userBrands.map((ub) => ub.brandId);

    if (brandIds.length === 0) {
      return NextResponse.json(emptyPayload());
    }

    const [
      totalContentThisWeek,
      totalContentPrevWeek,
      publishedTodayCount,
      publishedYesterdayCount,
      draftedCount,
      scheduledCount,
      publishedCount,
      failedCount,
      totalBrands,
      connectedAccounts,
      pendingInvites,
      scheduledTodayCount,
      platformGroups,
      engagementAgg,
      engagementAggPrevWeek,
      topPostAnalytics,
      upcomingSchedule,
      recentFiles,
      notifications,
      connectedSocialAccounts,
    ] = await Promise.all([
      prisma.post.count({
        where: { brandId: { in: brandIds }, createdAt: { gte: last7Start } },
      }),
      prisma.post.count({
        where: {
          brandId: { in: brandIds },
          createdAt: { gte: prev7Start, lt: prev7End },
        },
      }),
      prisma.post.count({
        where: {
          brandId: { in: brandIds },
          status: "PUBLISHED",
          publishedAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.post.count({
        where: {
          brandId: { in: brandIds },
          status: "PUBLISHED",
          publishedAt: { gte: yestStart, lte: yestEnd },
        },
      }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "DRAFTED" } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "SCHEDULED" } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "PUBLISHED" } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "FAILED" } }),
      prisma.userBrand.count({ where: { userId } }),
      prisma.socialAccountBrand.count({ where: { brandId: { in: brandIds } } }),
      prisma.brandInvitation.count({
        where: { invitedToId: userId, status: "PENDING", expiresAt: { gt: now } },
      }),
      prisma.post.count({
        where: {
          brandId: { in: brandIds },
          status: "SCHEDULED",
          scheduledAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.post.groupBy({
        by: ["platform"],
        where: { brandId: { in: brandIds } },
        _count: { id: true },
      }),
      prisma.postAnalytics.aggregate({
        where: { post: { brandId: { in: brandIds }, publishedAt: { gte: last7Start } } },
        _avg: { engagementRate: true },
      }),
      prisma.postAnalytics.aggregate({
        where: {
          post: {
            brandId: { in: brandIds },
            publishedAt: { gte: prev7Start, lt: prev7End },
          },
        },
        _avg: { engagementRate: true },
      }),
      prisma.postAnalytics.findFirst({
        where: { post: { brandId: { in: brandIds } } },
        orderBy: { engagementRate: "desc" },
        include: {
          post: { select: { id: true, title: true, content: true, platform: true, publishedAt: true, brand: { select: { name: true } } } },
        },
      }),
      prisma.post.findMany({
        where: { brandId: { in: brandIds }, status: "SCHEDULED", scheduledAt: { gte: now } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
        select: { id: true, title: true, content: true, platform: true, scheduledAt: true, status: true },
      }),
      prisma.knowledgeBase.findMany({
        where: { brandId: { in: brandIds } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, title: true, fileName: true, type: true, createdAt: true },
      }),
      prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, title: true, message: true, type: true, createdAt: true },
      }),
      prisma.socialAccountBrand.findMany({
        where: { brandId: { in: brandIds } },
        select: {
          socialAccount: { select: { platform: true, tokenExpiresAt: true, platformUsername: true } },
        },
      }),
    ]);

    // Dedupe connected platforms + derive health from token expiry
    const platformMap = new Map<string, { platform: string; expired: boolean }>();
    for (const row of connectedSocialAccounts) {
      const sa = row.socialAccount;
      const expired = !!sa.tokenExpiresAt && sa.tokenExpiresAt < now;
      const existing = platformMap.get(sa.platform);
      // if any account for this platform is expired, flag the platform as expired
      if (!existing || (expired && !existing.expired)) {
        platformMap.set(sa.platform, { platform: sa.platform, expired });
      }
    }
    const platformHealth = Array.from(platformMap.values());

    // "Top performing" pipeline count: posts whose engagement beat the 7-day average
    const avgEngagement = engagementAgg._avg.engagementRate ?? 0;
    const topPerformingCount =
      avgEngagement > 0
        ? await prisma.postAnalytics.count({
            where: {
              post: { brandId: { in: brandIds } },
              engagementRate: { gt: avgEngagement * 1.5 },
            },
          })
        : 0;

    // Team activity via AuditLog for anyone on the same brands
    const memberUserIds = (
      await prisma.userBrand.findMany({
        where: { brandId: { in: brandIds } },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const teamActivity = await prisma.auditLog.findMany({
      where: { userId: { in: memberUserIds } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, action: true, createdAt: true, user: { select: { name: true, email: true } } },
    });

    const totalPlatformPosts = platformGroups.reduce((sum, g) => sum + g._count.id, 0);

    return NextResponse.json({
      stats: {
        totalContent: totalContentThisWeek,
        totalContentDeltaPct: pctChange(totalContentThisWeek, totalContentPrevWeek),
        publishedToday: publishedTodayCount,
        publishedTodayDeltaPct: pctChange(publishedTodayCount, publishedYesterdayCount),
        engagementRate: Number((engagementAgg._avg.engagementRate ?? 0).toFixed(1)),
        engagementDeltaPct: pctChange(
          engagementAgg._avg.engagementRate ?? 0,
          engagementAggPrevWeek._avg.engagementRate ?? 0
        ),
      },
      priorities: {
        expiredPlatforms: platformHealth.filter((p) => p.expired).map((p) => p.platform),
        pendingInvites,
        drafted: draftedCount,
        scheduledToday: scheduledTodayCount,
      },
      pipeline: {
        drafted: draftedCount,
        scheduled: scheduledCount,
        published: publishedCount,
        failed: failedCount,
        topPerforming: topPerformingCount,
      },
      platformBreakdown: platformGroups
        .map((g) => ({
          platform: g.platform,
          count: g._count.id,
          percentage: totalPlatformPosts ? Math.round((g._count.id / totalPlatformPosts) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),
      topPost: topPostAnalytics
        ? {
            id: topPostAnalytics.post.id,
            title: topPostAnalytics.post.title,
            content: topPostAnalytics.post.content,
            platform: topPostAnalytics.post.platform,
            publishedAt: topPostAnalytics.post.publishedAt,
            brandName: topPostAnalytics.post.brand.name,
            reach: topPostAnalytics.reach,
            likes: topPostAnalytics.likes,
            comments: topPostAnalytics.comments,
            shares: topPostAnalytics.shares,
          }
        : null,
      schedule: upcomingSchedule,
      recentFiles: recentFiles.map((f) => ({
        id: f.id,
        name: f.fileName || f.title,
        type: f.type,
        createdAt: f.createdAt,
      })),
      teamActivity: teamActivity.map((a) => ({
        id: a.id,
        userName: a.user?.name || a.user?.email || "Someone",
        action: a.action,
        createdAt: a.createdAt,
      })),
      platformHealth,
      notifications,
      meta: { totalBrands, connectedAccounts, pendingInvites },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function emptyPayload() {
  return {
    stats: { totalContent: 0, totalContentDeltaPct: null, publishedToday: 0, publishedTodayDeltaPct: null, engagementRate: 0, engagementDeltaPct: null },
    priorities: { expiredPlatforms: [], pendingInvites: 0, drafted: 0, scheduledToday: 0 },
    pipeline: { drafted: 0, scheduled: 0, published: 0, failed: 0, topPerforming: 0 },
    platformBreakdown: [],
    topPost: null,
    schedule: [],
    recentFiles: [],
    teamActivity: [],
    platformHealth: [],
    notifications: [],
    meta: { totalBrands: 0, connectedAccounts: 0, pendingInvites: 0 },
  };
}