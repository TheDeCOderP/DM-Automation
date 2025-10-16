import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req });

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ message: "Brand ID are required." }, { status: 400 });
    }

    // Step 1: Find the SocialAccountBrand link for that platform + brand
    const link = await prisma.socialAccountBrand.findFirst({
      where: {
        brandId,
        socialAccount: {
          platform: "FACEBOOK",
        },
      },
    });

    if (!link) {
      return NextResponse.json({ message: "Social account not found for this brand." }, { status: 404 });
    }

    // Step 2: Delete the relation (and optionally the SocialAccount itself)
    await prisma.socialAccountBrand.delete({
      where: { id: link.id },
    });

    // Optional: delete the social account if no other brands or users use it
    const stillUsed = await prisma.socialAccountBrand.findFirst({
      where: { socialAccountId: link.socialAccountId },
    });

    const stillUsedByUser = await prisma.userSocialAccount.findFirst({
      where: { socialAccountId: link.socialAccountId },
    });

    if (!stillUsed && !stillUsedByUser) {
      await prisma.socialAccount.delete({
        where: { id: link.socialAccountId },
      });
    }

    return NextResponse.json({ message: "Social account disconnected successfully." }, { status: 200 });
  } catch (error) {
    console.error("Error disconnecting social account:", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
