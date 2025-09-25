import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { generateSequentialId } from "@/lib/id-generator";

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

export async function POST(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if(authError) return authError;

    const body = await req.json();
    const { users } = body;

    if (!users || !Array.isArray(users)) {
      return NextResponse.json({ error: "users is required" }, { status: 400 });
    }

    const createdUsers = [];
    for (const user of users) {
      const { name, email, password, role: roleName } = user;
      if (!name || !email || !password) {
        continue;
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        continue;
      }

      const roleConnect: { roleId?: string } = {};
      if (roleName) {
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (role) {
          roleConnect.roleId = role.id;
        }
      }

      const hashed = await bcrypt.hash(password, 12);
      // Generate sequential user ID like PCU-0001
      const newUserId: string = await generateSequentialId("PCU");

      const created = await prisma.user.create({
        data: {
          id: newUserId,
          name,
          email,
          password: hashed,
          ...roleConnect,
        },
        select: { id: true, name: true, email: true, role: { select: { id: true, name: true } } },
      });
      createdUsers.push(created);
    }

    return NextResponse.json({ createdUsers }, { status: 201 });
  } catch (error) {
    console.error("Error importing users:", error);
    return NextResponse.json("Internal Server Error", { status: 500 });
  }
}
