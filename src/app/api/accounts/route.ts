import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { Platform } from "@prisma/client";

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const userBrands = await prisma.userBrand.findMany({
      where: {
        userId: token.id,
      },
      include: {
        brand: {
          include: {
            socialAccounts: {
              include: {
                pageTokens: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        data: userBrands.flatMap((ub) => ub.brand.socialAccounts),
        brands: userBrands.map((ub) => ub.brand),
      },
      { status: 200 },
    )
  } catch (error) {
    console.log("Error fetching accounts:", error)
    return NextResponse.json({ error: `Error fetching accounts ${error}` }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as Platform;

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    await prisma.socialAccount.updateMany({
      where: {
        userId: token.id as string,
        platform,
      },
      data,
    });

    return NextResponse.json({ message: "Social account updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating social account:", error);
    return NextResponse.json({ error: "Failed to update social account" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as Platform;

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    await prisma.socialAccount.deleteMany({
      where: {
        userId: token.id as string,
        platform,
      },
    });

    return NextResponse.json({ message: "Social account deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting social account:", error);
    return NextResponse.json({ error: "Failed to delete social account" }, { status: 500 });
  };
}
