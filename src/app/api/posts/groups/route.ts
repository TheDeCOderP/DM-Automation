import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit;

    const groups = await prisma.postGroup.findMany({
        where: {  
            posts: {
            some: {
                userId: token.id,
                status: {
                    in: ["SCHEDULED", "PUBLISHED"],
                },
            },
            },
        },
        include: {
            posts: {
                include: {
                    media: true,
                    brand: true,
                    socialAccountPage: true,
                    user: {
                    select: {
                        name: true,
                        email: true,
                        image: true,
                    },
                    },
                },
            }
        }
    });

    if(!groups){
      return new NextResponse("No Groups Found", {status: 404})
    }

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}