import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { NextResponse, type NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit

    // Get total count for pagination
    const totalMedia = await prisma.media.count({
      where: {
        userId: token.id,
      },
    })

    const media = await prisma.media.findMany({
      where: {
        userId: token.id,
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            platform: true,
            status: true,
            createdAt: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(totalMedia / limit)

    return NextResponse.json({ 
      media,
      pagination: {
        currentPage: page,
        totalPages,
        totalMedia,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    }, { status: 200 })
  } catch (error) {
    console.log("Error fetching media:", error)
    return NextResponse.json({ error: `Error fetching media ${error}` }, { status: 500 })
  }
}