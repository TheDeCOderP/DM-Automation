import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

// Helper to convert Google's string ratings to integers
const mapStarRating = (rating: string) => {
  const map: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[rating] || 0;
};

export async function GET(
  req: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = await context.params;

    // Fetch the specific business and include all its reviews
    const business = await prisma.gbpLocation.findUnique({
      where: { 
        id: locationId 
      },
      include: {
        reviews: {
          orderBy: {
            createTime: 'desc', // Sort reviews so the newest ones appear first
          }
        },
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("Error fetching business details:", error);
    return NextResponse.json(
      { error: "Failed to fetch business details" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ locationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { locationId } = await context.params;

    // 1. Fetch the specific business and its associated Google token
    const business = await prisma.gbpLocation.findUnique({
      where: { id: locationId },
      include: { socialAccount: true },
    });

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    let accessToken = await decryptToken(business.socialAccount.accessToken);

    if (isTokenExpired(business.socialAccount.tokenExpiresAt)) {
      console.log(`[GBP] Token expired for account ${business.socialAccount.id}. Refreshing...`);
      accessToken = await refreshAccessToken(business.socialAccount);
    }

    // 2. Fetch reviews from Google API (v4 endpoint handles reviews)
    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${business.locationName}/reviews`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!reviewsRes.ok) {
      const errorText = await reviewsRes.text();
      console.error("Google API Error:", errorText);
      throw new Error("Failed to fetch reviews from Google");
    }

    const reviewsData = await reviewsRes.json();
    const googleReviews = reviewsData.reviews || [];
    let syncedCount = 0;

    // 3. Upsert reviews into our database
    for (const rev of googleReviews) {
      await prisma.gbpReview.upsert({
        where: { reviewId: rev.reviewId },
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
          reviewId: rev.reviewId,
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