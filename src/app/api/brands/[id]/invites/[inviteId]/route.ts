import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  const { id: brandId, inviteId } = await context.params;

  if (!brandId || !inviteId) {
    return NextResponse.json({ error: "Brand ID and Invite ID are required" }, { status: 400 });
  }

  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { roleId } = await req.json();
    if (!roleId) {
      return NextResponse.json({ error: "Role ID is required" }, { status: 400 });
    }

    const currentUserBrand = await prisma.userBrand.findUnique({
      where: { userId_brandId: { userId: token.id, brandId } },
      include: { role: true },
    });

    if (!currentUserBrand || currentUserBrand.role.name !== "BrandAdmin") {
      return NextResponse.json({ error: "Only brand admins can change invite roles" }, { status: 403 });
    }

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    await prisma.brandInvitation.update({
      where: { id: inviteId, brandId, status: "PENDING" },
      data: { metadata: { roleId } },
    });

    return NextResponse.json({ message: "Invite role updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating invite role:", error);
    return NextResponse.json({ error: "Failed to update invite role" }, { status: 500 });
  }
}
