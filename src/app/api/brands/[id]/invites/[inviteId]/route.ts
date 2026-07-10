import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

async function getAdminBrand(token: { id: string }, brandId: string) {
  return prisma.userBrand.findUnique({
    where: { userId_brandId: { userId: token.id, brandId } },
    include: { role: true },
  });
}

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

    const currentUserBrand = await getAdminBrand(token, brandId);
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

export async function DELETE(
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
    const currentUserBrand = await getAdminBrand(token, brandId);
    if (!currentUserBrand || currentUserBrand.role.name !== "BrandAdmin") {
      return NextResponse.json({ error: "Only brand admins can revoke invitations" }, { status: 403 });
    }

    const invitation = await prisma.brandInvitation.findFirst({
      where: { id: inviteId, brandId },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING" && invitation.status !== "EXPIRED") {
      return NextResponse.json(
        { error: "Only pending or expired invitations can be revoked" },
        { status: 400 }
      );
    }

    await prisma.brandInvitation.update({
      where: { id: inviteId },
      data: { status: "REVOKED" },
    });

    return NextResponse.json({ message: "Invitation revoked successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error revoking invitation:", error);
    return NextResponse.json({ error: "Failed to revoke invitation" }, { status: 500 });
  }
}
