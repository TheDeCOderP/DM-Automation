import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

// Helper to map Google's string star ratings to integers
const mapStarRating = (rating: string): number => {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[rating] || 0;
};

// Security Gatekeeper: Verifies the user belongs to the brand that owns this location
async function verifyUserBrandAccess(userId: string, locationId: string) {
  const location = await prisma.gbpLocation.findUnique({
    where: { id: locationId },
    select: { brandId: true },
  });

  if (!location) return null;

  const membership = await prisma.userBrand.findUnique({
    where: {
      userId_brandId: {
        userId,
        brandId: location.brandId,
      },
    },
  });

  return membership ? location.brandId : null;
}

// ─── GET: FETCH SYNCED REVIEWS FROM DATABASE ─────────────────────────────────
// Supports pagination (?page=1&limit=10) and filtering (?rating=5)
export async function GET(
  req: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = await context.params;

    // Multi-tenant isolation verification
    const hasAccess = await verifyUserBrandAccess(session.user.id, locationId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Access denied to this location" }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10")));
    const ratingStr = searchParams.get("rating");
    const skip = (page - 1) * limit;

    // Build query conditions
    const whereCondition: any = { gbpLocationId: locationId };
    if (ratingStr) {
      const ratingInt = parseInt(ratingStr);
      if (!isNaN(ratingInt)) whereCondition.starRating = ratingInt;
    }

    // Fetch total count and database records concurrently
    const [total, reviews] = await prisma.$transaction([
      prisma.gbpReview.count({ where: whereCondition }),
      prisma.gbpReview.findMany({
        where: whereCondition,
        orderBy: { createTime: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching reviews from DB:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ─── POST: SYNC REVIEWS FROM GOOGLE BUSINESS PROFILE V1 API ──────────────────
// ─── POST: SYNC REVIEWS FROM GOOGLE MY BUSINESS V4 API ──────────────────
export async function POST(
  req: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = await context.params;

    // Secure Data Isolation Check
    const hasAccess = await verifyUserBrandAccess(session.user.id, locationId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Access denied to this location" }, { status: 403 });
    }

    const business = await prisma.gbpLocation.findUnique({
      where: { id: locationId },
      include: { socialAccount: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    let accessToken = await decryptToken(business.socialAccount.accessToken);

    if (isTokenExpired(business.socialAccount.tokenExpiresAt)) {
      console.log(`[GBP] Token expired for account ${business.socialAccount.id}. Refreshing...`);
      accessToken = await refreshAccessToken(business.socialAccount);
    }

    // 1. Fetch the user's GBP accounts to get the required `accountId` prefix for the v4 API
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!accountsRes.ok) {
      console.error("Failed to fetch account context for v4 routing");
      return NextResponse.json({ error: "Failed to resolve Google Account ID" }, { status: 502 });
    }
    
    const accountsData = await accountsRes.json();
    const gbpAccounts = accountsData.accounts || [];

    let googleReviews = [];
    let fetchSuccess = false;

    // 2. Reviews are STILL on v4. We must construct: accounts/{accountId}/locations/{locationId}/reviews
    for (const account of gbpAccounts) {
      // account.name is "accounts/123456"
      // business.locationName is "locations/789012"
      // Concatenated it becomes: "accounts/123456/locations/789012/reviews"
      const reviewsRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${account.name}/${business.locationName}/reviews`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (reviewsRes.ok) {
        const reviewsData = await reviewsRes.json();
        googleReviews = reviewsData.reviews || [];
        fetchSuccess = true;
        break; // Successfully found the correct account and fetched reviews
      }
    }

    if (!fetchSuccess) {
      return NextResponse.json({ error: "Failed to fetch reviews from Google My Business v4 API. Location may not belong to connected account." }, { status: 502 });
    }

    let syncedCount = 0;

    for (const rev of googleReviews) {
      // Pulling reviewId identifier correctly out of full resource name path
      const rawReviewId = rev.reviewId;

      await prisma.gbpReview.upsert({
        where: { reviewId: rawReviewId },
        update: {
          reviewerName: rev.reviewer?.displayName,
          reviewerImage: rev.reviewer?.profilePhotoUrl,
          starRating: mapStarRating(rev.starRating),
          comment: rev.comment,
          updateTime: rev.updateTime ? new Date(rev.updateTime) : null,
          replyComment: rev.reviewReply?.comment || null,
          replyUpdateTime: rev.reviewReply?.updateTime ? new Date(rev.reviewReply.updateTime) : null,
          isReplied: !!rev.reviewReply,
        },
        create: {
          gbpLocationId: business.id,
          reviewId: rawReviewId,
          reviewerName: rev.reviewer?.displayName,
          reviewerImage: rev.reviewer?.profilePhotoUrl,
          starRating: mapStarRating(rev.starRating),
          comment: rev.comment,
          createTime: new Date(rev.createTime),
          updateTime: rev.updateTime ? new Date(rev.updateTime) : null,
          replyComment: rev.reviewReply?.comment || null,
          replyUpdateTime: rev.reviewReply?.updateTime ? new Date(rev.reviewReply.updateTime) : null,
          isReplied: !!rev.reviewReply,
        },
      });
      syncedCount++;
    }

    return NextResponse.json({ 
      message: `Successfully synced ${syncedCount} reviews.`,
      count: syncedCount
    });
  } catch (error) {
    console.error("Error syncing reviews:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}