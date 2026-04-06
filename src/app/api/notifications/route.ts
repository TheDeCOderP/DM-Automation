import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const status = searchParams.get('status'); // 'unread' | 'read' | null (all)

    const where: Record<string, unknown> = { userId: token.id };
    if (status === 'unread') where.read = false;
    else if (status === 'read') where.read = true;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, type: true, title: true, message: true,
          read: true, metadata: true, createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({ success: true, data: notifications, total }, { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Mark all as read
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'mark-all-read') {
      await prisma.notification.updateMany({
        where: { userId: token.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
