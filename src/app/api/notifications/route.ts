import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '10');
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const notifications = await prisma.notification.findMany({
      where: {
        userId: token.sub,
      },
      take: limit,
      skip: offset,
      include: {
        user: true
      },
      orderBy: [
        {
          createdAt: 'desc',
        }
      ]
    });

    return NextResponse.json({ 
      success: true,
      data: notifications
    }, { status: 200 });
  } catch (error) {
    console.log(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}