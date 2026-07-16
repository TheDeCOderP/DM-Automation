import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { decryptToken } from "@/lib/encryption";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

export async function PUT(
  req: Request,
  context: { params: Promise<{ locationId: string; reviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { locationId, reviewId } = await context.params;
    const { comment } = await req.json();

    if (!comment || comment.trim() === "") {
      return NextResponse.json({ error: "Reply comment cannot be empty." }, { status: 400 });
    }

    // 1. Fetch business and tokens
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

    // 2. Fetch the GBP Accounts to retrieve the Account ID
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    if (!accountsRes.ok) throw new Error("Failed to fetch GBP accounts");
    
    const accountsData = await accountsRes.json();
    const gbpAccounts = accountsData.accounts || [];

    let replySuccess = false;

    // 3. Send the PUT request to Google
    for (const gbpAccount of gbpAccounts) {
      const replyRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${gbpAccount.name}/${business.locationName}/reviews/${reviewId}/reply`,
        { 
          method: "PUT",
          headers: { 
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ comment }) // Google expects a 'comment' field in the body
        }
      );
      
      if (replyRes.ok) {
        replySuccess = true;
        break; // Successfully posted, exit loop
      }
    }

    if (!replySuccess) {
      throw new Error("Failed to post reply to Google.");
    }

    // 4. Update our local database so the UI reflects the change immediately
    const updatedReview = await prisma.gbpReview.update({
      where: { reviewId: reviewId },
      data: {
        replyComment: comment,
        replyUpdateTime: new Date(),
        isReplied: true,
      }
    });

    return NextResponse.json({ 
      message: "Reply posted successfully", 
      review: updatedReview 
    });
  } catch (error) {
    console.error("Error posting reply:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ locationId: string; reviewId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { locationId, reviewId } = await context.params;

    const business = await prisma.gbpLocation.findUnique({
      where: { id: locationId },
      include: { socialAccount: true },
    });

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const accessToken = await decryptToken(business.socialAccount.accessToken);

    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const accountsData = await accountsRes.json();
    const gbpAccounts = accountsData.accounts || [];

    let deleteSuccess = false;

    for (const gbpAccount of gbpAccounts) {
      const replyRes = await fetch(
        `https://mybusiness.googleapis.com/v4/${gbpAccount.name}/${business.locationName}/reviews/${reviewId}/reply`,
        { 
          method: "DELETE",
          headers: { "Authorization": `Bearer ${accessToken}` }
        }
      );
      
      if (replyRes.ok) {
        deleteSuccess = true;
        break;
      }
    }

    if (!deleteSuccess) throw new Error("Failed to delete reply from Google.");

    await prisma.gbpReview.update({
      where: { reviewId: reviewId },
      data: {
        replyComment: null,
        replyUpdateTime: null,
        isReplied: false,
      }
    });

    return NextResponse.json({ message: "Reply deleted successfully" });
  } catch (error) {
    console.error("Error deleting reply:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}