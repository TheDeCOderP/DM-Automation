import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: brandId } = await params;

    // Check brand access
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId,
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    // Get all social accounts connected to this brand
    const socialAccountBrands = await prisma.socialAccountBrand.findMany({
      where: {
        brandId,
      },
      include: {
        socialAccount: {
          include: {
            pages: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    // Format the response
    const accounts = socialAccountBrands.map((sab) => ({
      id: sab.socialAccount.id,
      platform: sab.socialAccount.platform,
      platformUsername: sab.socialAccount.platformUsername,
      platformUserImage: sab.socialAccount.platformUserImage,
      pages: sab.socialAccount.pages.map((page) => ({
        id: page.id,
        pageName: page.pageName,
        pageImage: page.pageImage,
      })),
    }));

    return NextResponse.json({ accounts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching social accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 }
    );
  }
}
