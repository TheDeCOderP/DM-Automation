import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/accounts/token-status
 * Returns all LinkedIn page tokens that are expired or expiring within N days
 * Used by the frontend to show token expiry warnings
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req });

  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Warn if token expires within 10 days
    const warningThreshold = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    // Get all brands this user has access to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: token.id as string },
      select: { brandId: true },
    });

    const brandIds = userBrands.map((ub) => ub.brandId);

    if (brandIds.length === 0) {
      return NextResponse.json({ expiredTokens: [], expiringTokens: [] });
    }

    // Get LinkedIn social accounts linked to user's brands
    const linkedinAccounts = await prisma.socialAccount.findMany({
      where: {
        platform: "LINKEDIN",
        brands: {
          some: {
            brandId: { in: brandIds },
          },
        },
      },
      select: {
        id: true,
        tokenExpiresAt: true,
        platformUsername: true,
        brands: {
          where: { brandId: { in: brandIds } },
          select: {
            brand: { select: { id: true, name: true } },
          },
        },
        pages: {
          where: {
            platform: "LINKEDIN",
            isActive: true,
          },
          select: {
            id: true,
            pageName: true,
            pageId: true,
            tokenExpiresAt: true,
          },
        },
      },
    });

    const expiredTokens: {
      type: "page" | "account";
      id: string;
      name: string;
      brandId: string;
      brandName: string;
      expiredAt: string;
    }[] = [];

    const expiringTokens: {
      type: "page" | "account";
      id: string;
      name: string;
      brandId: string;
      brandName: string;
      expiresAt: string;
      daysLeft: number;
    }[] = [];

    for (const account of linkedinAccounts) {
      const brandInfo = account.brands[0]?.brand;
      if (!brandInfo) continue;

      // Check page tokens
      for (const page of account.pages) {
        if (!page.tokenExpiresAt) continue;

        const expiresAt = new Date(page.tokenExpiresAt);

        if (expiresAt <= now) {
          expiredTokens.push({
            type: "page",
            id: page.id,
            name: page.pageName,
            brandId: brandInfo.id,
            brandName: brandInfo.name,
            expiredAt: expiresAt.toISOString(),
          });
        } else if (expiresAt <= warningThreshold) {
          const daysLeft = Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          expiringTokens.push({
            type: "page",
            id: page.id,
            name: page.pageName,
            brandId: brandInfo.id,
            brandName: brandInfo.name,
            expiresAt: expiresAt.toISOString(),
            daysLeft,
          });
        }
      }

      // Check personal account token too
      if (account.tokenExpiresAt) {
        const expiresAt = new Date(account.tokenExpiresAt);

        if (expiresAt <= now) {
          expiredTokens.push({
            type: "account",
            id: account.id,
            name: account.platformUsername || "LinkedIn Account",
            brandId: brandInfo.id,
            brandName: brandInfo.name,
            expiredAt: expiresAt.toISOString(),
          });
        } else if (expiresAt <= warningThreshold) {
          const daysLeft = Math.ceil(
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          expiringTokens.push({
            type: "account",
            id: account.id,
            name: account.platformUsername || "LinkedIn Account",
            brandId: brandInfo.id,
            brandName: brandInfo.name,
            expiresAt: expiresAt.toISOString(),
            daysLeft,
          });
        }
      }
    }

    // Deduplicate by id (same page can appear for multiple brands)
    const deduped = <T extends { id: string }>(arr: T[]): T[] => {
      const seen = new Set<string>();
      return arr.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
    };

    return NextResponse.json({
      expiredTokens: deduped(expiredTokens),
      expiringTokens: deduped(expiringTokens),
    });
  } catch (error) {
    console.error("[TOKEN-STATUS] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch token status" },
      { status: 500 }
    );
  }
}
