import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Platform, Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get("brandId")
    const platform = searchParams.get("platform")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build where clause based on filters
    const whereClause: Prisma.PostWhereInput = {}

    if (brandId && brandId !== "all") {
      whereClause.brandId = brandId
    }

    if (platform && platform !== "ALL") {
      whereClause.platform = platform as Platform
    }

    if (startDate || endDate) {
      whereClause.createdAt = {}
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate)
      }
    }

    // Get post counts by brand
    const postsByBrand = await prisma.post.groupBy({
      by: ["brandId"],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    })

    // Get brand details
    const brandIds = postsByBrand.map((p) => p.brandId)
    const brands = await prisma.brand.findMany({
      where: {
        id: {
          in: brandIds,
        },
      },
      select: {
        id: true,
        name: true,
        logo: true,
      },
    })

    // Get post counts by platform
    const postsByPlatform = await prisma.post.groupBy({
      by: ["platform"],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    })

    // Get post counts by user
    const postsByUser = await prisma.post.groupBy({
      by: ["userId"],
      where: whereClause,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    })

    // Get user details
    const userIds = postsByUser.map((p) => p.userId)
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
    })

    // Get detailed post data with relationships
    const detailedPosts = await prisma.post.findMany({
      where: whereClause,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit for performance
    })

    // Get total counts
    const totalPosts = await prisma.post.count({
      where: whereClause,
    })

    // Get all brands for filter dropdown
    const allBrands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({
      summary: {
        totalPosts,
        totalBrands: postsByBrand.length,
        totalUsers: postsByUser.length,
        totalPlatforms: postsByPlatform.length,
      },
      postsByBrand: postsByBrand.map((p) => ({
        ...p,
        brand: brands.find((b) => b.id === p.brandId),
      })),
      postsByPlatform,
      postsByUser: postsByUser.map((p) => ({
        ...p,
        user: users.find((u) => u.id === p.userId),
      })),
      detailedPosts,
      allBrands,
    })
  } catch (error) {
    console.error("Error fetching post reports:", error)
    return NextResponse.json({ error: "Failed to fetch post reports" }, { status: 500 })
  }
}
