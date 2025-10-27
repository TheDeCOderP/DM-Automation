import { decryptToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new Response("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");

    if (!platformUserId || typeof platformUserId !== 'string') {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    // Find the social account and its pages directly from database
    const account = await prisma.socialAccount.findFirst({
      where: {
        platformUserId: platformUserId,
        platform: "PINTEREST",
      },
      include: {
        pages: {
          where: {
            platform: "PINTEREST",
            isActive: true
          }
        }
      }
    });

    if (!account) {
      return NextResponse.json({ error: "No Pinterest account found" }, { status: 404 });
    }

    const accessToken = await decryptToken(account.accessToken);

    const pinterestResponse = await fetch(
      `https://api-sandbox.pinterest.com/v5/boards`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!pinterestResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch Pinterest boards" }, { status: 500 });
    }

    const pinterestData = await pinterestResponse.json();

    // Process Pinterest boards and store them as pages
    const pages = await Promise.all(
      pinterestData.items.map(async (board: { 
        id: string; 
        name: string; 
        description?: string;
        owner: { username: string };
        media: { image_cover_url?: string | null };
        created_at: string;
        privacy: string;
      }) => {
        // Upsert the board as a page in the database
        const socialAccountPage = await prisma.socialAccountPage.upsert({
          where: {
            pageId_socialAccountId: {
              pageId: board.id,
              socialAccountId: account.id
            }
          },
          update: {
            name: board.name,
            pageName: board.name,
            pageImage: board.media?.image_cover_url || null,
            accessToken: account.accessToken,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            name: board.name,
            pageId: board.id,
            pageName: board.name,
            pageImage: board.media?.image_cover_url || null,
            platform: 'PINTEREST',
            accessToken: account.accessToken,
            tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
            isActive: true,
            socialAccountId: account.id
          }
        });

        return {
          id: socialAccountPage.id,
          name: socialAccountPage.name,
          pageId: socialAccountPage.pageId,
          pageName: socialAccountPage.pageName,
          pageImage: socialAccountPage.pageImage,
          platform: 'PINTEREST',
          description: board.description,
          owner: board.owner,
          privacy: board.privacy,
          createdAt: board.created_at,
          isStored: true
        };
      })
    );

    return NextResponse.json({ 
      message: 'Pinterest boards fetched successfully', 
      pages: pages 
    });
  } catch (error) {
    console.log("Error while fetching boards:", error);
    return NextResponse.json({ error: `Something went wrong` }, { status: 500 });
  }
}