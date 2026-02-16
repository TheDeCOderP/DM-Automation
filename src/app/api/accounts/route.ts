import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { Platform } from "@prisma/client";

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    // Get brandId from query params for filtering (optional - backward compatible)
    const { searchParams } = new URL(req.url);
    const filterBrandId = searchParams.get("brandId");

    const userBrands = await prisma.userBrand.findMany({
      where: {
        userId: token.id,
        ...(filterBrandId && { brandId: filterBrandId }), // Filter by specific brand if provided
      },
      include: {
        brand: {
          include: {
            socialAccounts: {
              where: {
                // If filtering by specific brand, show ALL accounts for that brand
                // If not filtering, only show accounts connected by this user
                ...(filterBrandId ? {} : { connectedByUserId: token.id }),
                socialAccount: {
                  platform: {
                    not: {
                      in: ["ZOHO_WORKDRIVE", "GOOGLE"]
                    }
                  }
                },
              },
              include: {
                connectedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                },
                socialAccount: {
                  include: {
                    pages: true,
                    users: {
                      include: {
                        user: true
                      }
                    }
                  },
                }
              },
            },
          },
        },
      },
    })

    // Transform the data to make it more usable
    const socialAccounts = userBrands.flatMap(ub => 
      ub.brand.socialAccounts.map(sa => ({
        ...sa.socialAccount,
        brandId: ub.brand.id,
        brandName: ub.brand.name,
        connectedBy: sa.connectedBy, // Add who connected this account
        // Add user info from the junction table
        userAccess: sa.socialAccount.users.find(u => u.userId === token.id)
      }))
    );

    const brands = userBrands.map(ub => ub.brand);

    return NextResponse.json(
      {
        data: socialAccounts,
        brands: brands,
      },
      { status: 200 },
    )
  } catch (error) {
    console.log("Error fetching accounts:", error)
    return NextResponse.json({ error: `Error fetching accounts ${error}` }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as Platform;
    const socialAccountId = searchParams.get("socialAccountId");

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    // Find the user's social account through the junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId: token.id,
        socialAccount: {
          platform: platform,
          ...(socialAccountId && { id: socialAccountId })
        }
      },
      include: {
        socialAccount: true
      }
    });

    if (!userSocialAccount) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    // Prevent updating fields that are part of unique constraints
    const { platformUserId, platformUsername, platform: _, ...safeData } = data;
    
    // Update the social account with safe data only
    await prisma.socialAccount.update({
      where: {
        id: userSocialAccount.socialAccountId,
      },
      data: safeData,
    });

    return NextResponse.json({ message: "Social account updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating social account:", error);
    return NextResponse.json({ error: "Failed to update social account" }, { status: 500 });
  }
};

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get("platform") as Platform;
    const socialAccountId = searchParams.get("socialAccountId");

    if (!platform) {
      return NextResponse.json({ error: "Platform is required" }, { status: 400 });
    }

    // Find the user's social account through the junction table
    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        userId: token.id,
        socialAccount: {
          platform: platform,
          ...(socialAccountId && { id: socialAccountId })
        }
      },
      include: {
        socialAccount: {
          include: {
            brands: true, // Include brand connections to check if account is used by brands
            pages: true // Include page tokens to handle cleanup
          }
        }
      }
    });

    if (!userSocialAccount) {
      return NextResponse.json({ error: "Social account not found" }, { status: 404 });
    }

    // Remove the user's access to the social account (delete junction record)
    await prisma.userSocialAccount.delete({
      where: {
        id: userSocialAccount.id,
      },
    });

    // Check if this was the last user with access to this social account
    const remainingUsers = await prisma.userSocialAccount.count({
      where: {
        socialAccountId: userSocialAccount.socialAccountId,
      },
    });

    // Check if the social account is connected to any brands by this user
    const remainingBrands = await prisma.socialAccountBrand.count({
      where: {
        socialAccountId: userSocialAccount.socialAccountId,
        connectedByUserId: token.id
      },
    });

    // If this user has no more brand connections, remove the brand associations
    if (remainingBrands > 0) {
      await prisma.socialAccountBrand.deleteMany({
        where: {
          socialAccountId: userSocialAccount.socialAccountId,
          connectedByUserId: token.id
        },
      });
    }

    // If no users AND no brands left, delete the social account entirely
    if (remainingUsers === 0 && remainingBrands === 0) {
      // First delete related page tokens to avoid foreign key constraints
      if (userSocialAccount.socialAccount.pages.length > 0) {
        await prisma.socialAccountPage.deleteMany({
          where: {
            socialAccountId: userSocialAccount.socialAccountId,
          },
        });
      }

      // Then delete the social account
      await prisma.socialAccount.delete({
        where: {
          id: userSocialAccount.socialAccountId,
        },
      });
    }

    return NextResponse.json({ 
      message: "Social account disconnected successfully",
      completelyRemoved: remainingUsers === 0 && remainingBrands === 0
    }, { status: 200 });
  } catch (error) {
    console.error("Error deleting social account:", error);
    return NextResponse.json({ 
      error: "Failed to delete social account",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  };
}