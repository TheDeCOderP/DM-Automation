import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await context.params;
  if (!id) return new NextResponse("Notification ID is required.", { status: 400 });

  try {
    await prisma.notification.updateMany({
      where: { id, userId: token.id },
      data: { read: true },
    });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error updating notification:", error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await context.params;
  if (!id) return new NextResponse("Notification ID is required.", { status: 400 });

  try {
    await prisma.notification.deleteMany({
      where: { id, userId: token.id },
    });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return new NextResponse(null, { status: 500 });
  }
}
