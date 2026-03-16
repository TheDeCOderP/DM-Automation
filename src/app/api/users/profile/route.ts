import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: token.id },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { id: token.id } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const updateData: { name?: string; password?: string } = {};

  if (name !== undefined) updateData.name = name.trim();

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }
    if (!user.password) {
      return NextResponse.json({ error: "No password set for this account" }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(newPassword, 10);
  }

  const updated = await prisma.user.update({
    where: { id: token.id },
    data: updateData,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user: updated });
}
