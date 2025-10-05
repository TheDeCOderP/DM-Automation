import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { Platform } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isTokenExpired, refreshAccessToken } from "@/utils/token";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Get user's Google accounts through the junction table
    const userSocialAccounts = await prisma.userSocialAccount.findMany({
      where: {
        userId: token.id,
        socialAccount: {
          platform: Platform.GOOGLE
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccounts.length) {
      throw new Error("No Google Account found");
    }

    const accounts = await Promise.all(
      userSocialAccounts.map(async (userSocialAccount) => {
        let socialAccount = userSocialAccount.socialAccount;
        
        // Check expiry and refresh if needed
        if (isTokenExpired(socialAccount.tokenExpiresAt)) {
          const newAccessToken = await refreshAccessToken(socialAccount);
          socialAccount = {
            ...socialAccount,
            accessToken: newAccessToken
          };
        }

        return socialAccount;
      })
    );

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    console.error("GET /api/google-account error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}