import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";


export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userEmail, brandId, newRole } = await req.json();

    if (!userEmail || !brandId || !newRole) {
      return NextResponse.json(
        { error: "Missing required fields: userEmail, brandId, newRole" },
        { status: 400 }
      );
    }

    // Validate newRole
    const validRoles = ["BrandAdmin", "BrandEditor", "BrandUser"];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the brand
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Check if current user is admin of this brand
    const currentUserBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: brandId,
      },
      include: {
        role: true,
      },
    });

    if (!currentUserBrand || currentUserBrand.role?.name !== "BrandAdmin") {
      return NextResponse.json(
        { error: "Only Brand Admins can change member roles" },
        { status: 403 }
      );
    }

    // Find the target user's brand membership
    const targetUserBrand = await prisma.userBrand.findFirst({
      where: {
        userId: targetUser.id,
        brandId: brandId,
      },
      include: {
        role: true,
      },
    });

    if (!targetUserBrand) {
      return NextResponse.json(
        { error: "User is not a member of this brand" },
        { status: 404 }
      );
    }

    // Find the new role
    const role = await prisma.role.findFirst({
      where: { name: newRole },
    });

    if (!role) {
      return NextResponse.json(
        { error: `Role "${newRole}" not found in database` },
        { status: 404 }
      );
    }

    // Update the role
    const updatedUserBrand = await prisma.userBrand.update({
      where: {
        id: targetUserBrand.id,
      },
      data: {
        roleId: role.id,
        updatedAt: new Date(),
      },
      include: {
        role: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        message: "Role updated successfully",
        data: {
          user: updatedUserBrand.user.name,
          email: updatedUserBrand.user.email,
          brand: updatedUserBrand.brand.name,
          oldRole: targetUserBrand.role?.name,
          newRole: updatedUserBrand.role?.name,
          updatedAt: updatedUserBrand.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error changing user role:", error);
    return NextResponse.json(
      { error: "Failed to change user role" },
      { status: 500 }
    );
  }
}
