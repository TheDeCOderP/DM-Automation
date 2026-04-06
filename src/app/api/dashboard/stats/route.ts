import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { subDays, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = token.id;
    const since = startOfDay(subDays(new Date(), 30));

    // Get all brand IDs the user belongs to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId },
      select: { brandId: true },
    });
    const brandIds = userBrands.map((ub) => ub.brandId);

    const [
      totalPosts,
      publishedPosts,
      scheduledPosts,
      failedPosts,
      totalBrands,
      connectedAccounts,
      pendingInvites,
      recentPosts,
      recentNotifications,
    ] = await Promise.all([
      prisma.post.count({ where: { brandId: { in: brandIds } } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "PUBLISHED" } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "SCHEDULED" } }),
      prisma.post.count({ where: { brandId: { in: brandIds }, status: "FAILED" } }),
      prisma.userBrand.count({ where: { userId } }),
      prisma.socialAccountBrand.count({ where: { brandId: { in: brandIds } } }),
      prisma.brandInvitation.count({
        where: { invitedToId: userId, status: "PENDING", expiresAt: { gt: new Date() } },
      }),
      prisma.post.findMany({
        where: { brandId: { in: brandIds }, createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          content: true,
          platform: true,
          status: true,
          createdAt: true,
          brand: { select: { name: true } },
        },
      }),
      prisma.notification.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, message: true, type: true, createdAt: true },
      }),
    ]);

    // Posts per day for the last 7 days
    const last7Days = await prisma.post.groupBy({
      by: ["createdAt"],
      where: {
        brandId: { in: brandIds },
        createdAt: { gte: startOfDay(subDays(new Date(), 6)) },
      },
      _count: { id: true },
    });

    return NextResponse.json({
      stats: {
        totalPosts,
        publishedPosts,
        scheduledPosts,
        failedPosts,
        totalBrands,
        connectedAccounts,
        pendingInvites,
      },
      recentPosts,
      recentNotifications,
      last7Days,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
