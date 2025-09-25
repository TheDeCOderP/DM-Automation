import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

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
  try {
    const authError = await checkAuth(req);
    if(authError) return authError;

    const permissions = await prisma.permission.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ permissions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}