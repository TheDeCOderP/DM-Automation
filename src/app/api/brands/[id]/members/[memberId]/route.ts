import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest, 
  context: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: brandId, memberId } = await context.params;
  
  if (!brandId || !memberId) {
    return NextResponse.json({ error: "Brand ID and Member ID are required" }, { status: 400 });
  }

  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if the current user is an admin of this brand
    const currentUserBrand = await prisma.userBrand.findUnique({
      where: {
        userId_brandId: {
          userId: token.id,
          brandId: brandId,
        }
      },
      include: {
        role: true
      }
    });

    if (!currentUserBrand || currentUserBrand.role.name !== "BrandAdmin") {
      return NextResponse.json({ error: "Only brand admins can remove team members" }, { status: 403 });
    }

    // Check if the member exists in this brand
    const memberToRemove = await prisma.userBrand.findUnique({
      where: {
        userId_brandId: {
          userId: memberId,
          brandId: brandId,
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found in this brand" }, { status: 404 });
    }

    // Prevent admin from removing themselves
    if (memberId === token.id) {
      return NextResponse.json({ error: "You cannot remove yourself from the brand" }, { status: 400 });
    }

    // Remove the user from the brand
    await prisma.userBrand.delete({
      where: {
        userId_brandId: {
          userId: memberId,
          brandId: brandId,
        }
      }
    });

    // Also remove any pending invitations for this user to this brand
    await prisma.brandInvitation.updateMany({
      where: {
        brandId: brandId,
        invitedToId: memberId,
        status: "PENDING"
      },
      data: {
        status: "REVOKED"
      }
    });

    return NextResponse.json({ 
      message: "Team member removed successfully",
      removedMember: {
        name: memberToRemove.user.name,
        email: memberToRemove.user.email
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json({ error: "Failed to remove team member" }, { status: 500 });
  }
}