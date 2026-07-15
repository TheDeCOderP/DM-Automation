// /api/accounts/[accountId]
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { refreshAccessToken } from "@/utils/token"; // Adjust this import path to your actual utility file

export async function POST(
  req: Request,
  context: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { accountId } = await context.params;

    // 1. Security Check: Verify the user is actually connected to this social account
    const userAccountLink = await prisma.userSocialAccount.findUnique({
      where: {
        userId_socialAccountId: {
          userId: session.user.id,
          socialAccountId: accountId,
        },
      },
    });

    if (!userAccountLink) {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this account" },
        { status: 403 }
      );
    }

    // 2. Fetch the Social Account details
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: accountId },
    });

    if (!socialAccount) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    // 3. Trigger the refresh logic from your utility
    await refreshAccessToken(socialAccount);

    // 4. Fetch the updated account to return the new expiry status to the frontend
    const updatedAccount = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        lastSyncedAt: true,
        tokenExpiresAt: true,
      }
    });

    return NextResponse.json({
      message: `${socialAccount.platform} token successfully refreshed.`,
      account: updatedAccount
    });

  } catch (error: any) {
    console.error(`Error refreshing token for account:`, error);
    
    // Check if the error is a known thrown error from the utility (e.g., missing credentials)
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error";
    
    return NextResponse.json(
      { error: "Failed to refresh token", details: errorMessage },
      { status: 500 }
    );
  }
}