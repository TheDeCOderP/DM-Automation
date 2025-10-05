// app/api/accounts/zoho/workdrive/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { Platform } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    // Get user's Zoho WorkDrive accounts through the junction table
    const userSocialAccounts = await prisma.userSocialAccount.findMany({
      where: {
        userId: token.id,
        socialAccount: {
          platform: Platform.ZOHO_WORKDRIVE
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccounts.length) {
      return NextResponse.json({ isConnected: false }, { status: 200 }); 
    }

    return NextResponse.json({ isConnected: true }, { status: 200 });

  } catch (error) {
    console.error("GET /api/accounts/zoho/workdrive error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}