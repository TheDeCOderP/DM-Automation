// src/app/api/locations/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId");

    // 1. Get all brand IDs the user has access to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: session.user.id },
      select: { brandId: true },
    });
    
    const brandIds = userBrands.map((ub) => ub.brandId);

    // 2. Fetch all locations belonging to those brands
    const locations = await prisma.gbpLocation.findMany({
      where: {
        brandId: brandId && brandIds.includes(brandId) ? brandId : { in: brandIds },
      },
      include: {
        brand: {
          select: { name: true, logo: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ data: locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}