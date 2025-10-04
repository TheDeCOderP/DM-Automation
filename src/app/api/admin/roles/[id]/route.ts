import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

async function checkAuth(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: token.email! }, include: { role: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!["Admin", "SuperAdmin"].includes(user.role.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const body = await req.json().catch(() => null);
    const { name, permissions } = body || {} as { name: string; permissions: string[] };
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const perms = await prisma.permission.findMany({ where: { name: { in: permissions ?? [] } } });
    await prisma.role.update({
      where: { id },
      data: {
        name,
        permissions: {
          deleteMany: {},
          createMany: { data: perms.map((p) => ({ permissionId: p.id })) },
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
