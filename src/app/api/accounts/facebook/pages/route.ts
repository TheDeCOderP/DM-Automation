//api/accounts/facebook/pages/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");

    if (!platformUserId || typeof platformUserId !== 'string') {
      throw new Error('Invalid user id');
    }

    // Find the social account with page tokens
    const account = await prisma.socialAccount.findFirst({
      where: {
        platformUserId: platformUserId,
        platform: "FACEBOOK",
      },
      include: {
        pageTokens: true
      }
    });

    if (!account) throw new Error('No account found');

    // Fetch pages from Facebook API
    const facebookResponse = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?access_token=${account.accessToken}`
    );

    if (!facebookResponse.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const facebookData = await facebookResponse.json();
    if (facebookData.error) {
      throw new Error(facebookData.error.message);
    }

    // Process pages data
    const pages = await Promise.all(
      facebookData.data.map(async (page: { 
        id: string; 
        name: string; 
        access_token: string; 
        category?: string;
      }) => {
        // Upsert the page token
        const pageToken = await prisma.pageToken.upsert({
          where: {
            pageId_socialAccountId: {
              pageId: page.id,
              socialAccountId: account.id
            }
          },
          update: {
            accessToken: page.access_token,
            pageName: page.name,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true
          },
          create: {
            name: page.name,
            pageId: page.id,
            pageName: page.name,
            platform: 'FACEBOOK',
            accessToken: page.access_token,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true,
            socialAccountId: account.id
          }
        });

        return {
          id: pageToken.id,
          name: pageToken.name,
          pageId: pageToken.pageId,
          access_token: pageToken.accessToken,
          platform: 'FACEBOOK',
          category: page.category,
          isStored: true
        };
      })
    );

    return NextResponse.json({ 
      message: 'Facebook pages fetched and stored successfully', 
      pages: pages 
    });

  } catch (error) {
    console.log("Error fetching Facebook pages:", error);
    return NextResponse.json(
      { error: error || 'Failed to fetch pages' }, 
      { status: 500 }
    );
  }
}