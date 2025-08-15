import { prisma } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) {
    return new NextResponse("Notification ID is required.", { status: 400 });
  }
console.log(id);
  try {
    await prisma.notification.update({
      where: {
        id,
      },
      data: {
        read: true,
      },
    });
    
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error updating notification:", error);
    return new NextResponse(null, { status: 500 });
  }
}