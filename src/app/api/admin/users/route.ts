import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { generateSequentialId } from "@/lib/id-generator";
import { Prisma } from "@prisma/client"; // Import Prisma for type safety

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

export async function GET(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const page = searchParams.get("page") ?? "1";
  const per_page = searchParams.get("per_page") ?? "10";
  const sort = searchParams.get("sort");
  const email = searchParams.get("email");
  const role = searchParams.get("role");

  const where: Prisma.UserWhereInput = {};

  if (email) {
    where.email = { contains: email };
  }

  if (role) {
    where.roleId = role;
  }

  const [column, order] = sort?.split(".") ?? ["createdAt", "desc"];

  // Fix: Explicitly cast the 'order' string to a Prisma.SortOrder type
  const orderBy: Prisma.UserOrderByWithRelationInput = column === 'role' ? { role: { name: order as Prisma.SortOrder } } : { [column]: order as Prisma.SortOrder };

  const total = await prisma.user.count({ where });
  const pageCount = Math.ceil(total / parseInt(per_page));

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, image: true, roleId: true, role: { select: { id: true, name: true } } },
    orderBy: orderBy,
    skip: (parseInt(page) - 1) * parseInt(per_page),
    take: parseInt(per_page),
  });
  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  return NextResponse.json({ users, roles, pageCount });
}

// Create a user
export async function POST(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const { name, email, password, roleId } = (body || {}) as {
    name?: string;
    email?: string;
    password?: string;
    roleId?: string | null;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
  }

  // Unique email check
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Email already in use" }, { status: 400 });

  // Optional role validation
  const roleConnect: { roleId?: string } = {};
  if (roleId) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });
    roleConnect.roleId = roleId;
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

  try {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "USER_CREATED", resource: "/api/admin/users", metadata: { id: created.id, email: created.email, role: created.role?.name } });
  } catch {}

  return NextResponse.json({ user: created }, { status: 201 });
}

// Update user fields (name/email/role/password)
export async function PUT(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const { id, name, email, roleId, password } = (body || {}) as {
    id?: string;
    name?: string | null;
    email?: string | null;
    roleId?: string | null;
    password?: string | null;
  };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const updates: Prisma.UserUpdateInput = {};

  if (typeof name === "string") updates.name = name;
  if (typeof email === "string") {
    // ensure unique if changing
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail && byEmail.id !== id) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
    }
    updates.email = email;
  }
  if (typeof roleId === "string") {
    // Fix: Use the `connect` operation to update the relationship
    updates.role = { connect: { id: roleId } };
  }
  if (typeof password === "string" && password.length > 0) {
    if (password.length < 6) return NextResponse.json({ error: "password must be at least 6 characters" }, { status: 400 });
    updates.password = await bcrypt.hash(password, 12);
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, name: true, email: true, role: { select: { id: true, name: true } } },
  });

  try {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "USER_UPDATED", resource: "/api/admin/users", metadata: { id: updated.id, email: updated.email, role: updated.role?.name } });
  } catch {}

  return NextResponse.json({ user: updated });
}

export async function PATCH(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const { userId, roleId } = body || {};
  if (!userId || !roleId) return NextResponse.json({ error: "userId and roleId are required" }, { status: 400 });

  // ensure role exists
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const updated = await prisma.user.update({ where: { id: userId }, data: { roleId } });
  return NextResponse.json({ ok: true, userId: updated.id, roleId });
}

export async function DELETE(req: NextRequest) {
  const authError = await checkAuth(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const { id } = (body || {}) as { id?: string };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id } });

  try {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({ action: "USER_DELETED", resource: "/api/admin/users", metadata: { id } });
  } catch {}

  return NextResponse.json({ ok: true });
}
