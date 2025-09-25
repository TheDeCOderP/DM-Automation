import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

async function checkAuth(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: token.email! }, include: { role: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!["ADMIN", "SUPERADMIN"].includes(user.role.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const { searchParams } = req.nextUrl;
  const take = Math.min(parseInt(searchParams.get("take") || "50", 10), 200);
  const cursor = searchParams.get("cursor") || undefined;
  const userId = searchParams.get("userId") || undefined;
  const action = searchParams.get("action") || undefined;

  const where: Prisma.AuditLogWhereInput = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  const nextCursor = logs.length === take ? logs[logs.length - 1].id : null;

  return NextResponse.json({ data: logs, nextCursor });
}
