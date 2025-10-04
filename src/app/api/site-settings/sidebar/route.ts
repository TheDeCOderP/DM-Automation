import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";

// Define admin roles that should see everything
const ADMIN_ROLES = ["SuperAdmin", "Admin"];

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    
    if (!token || !token.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user with role information
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.role) {
      return NextResponse.json(
        { message: 'User role not assigned' },
        { status: 403 }
      );
    }

    const userRole = user.role.name;
    const isAdmin = ADMIN_ROLES.includes(userRole);
    
    console.log(`Fetching sidebar for user: ${token.email} with role: ${userRole} (Admin: ${isAdmin})`);

    // Build the where clause based on user's role
    const groupWhereClause = isAdmin ? {
      // For admins: show all active groups regardless of role restrictions
      isActive: true
    } : {
      // For non-admins: apply role-based filtering
      isActive: true,
      OR: [
        // Include groups that have role-specific access for this user's role
        {
          roleAccess: {
            some: {
              hasAccess: true,
              role: { name: userRole },
            },
          },
        },
        // Also include groups that are accessible to all (no specific role restrictions)
        {
          roleAccess: {
            none: {},
          },
        }
      ]
    };

    const itemWhereClause = isAdmin ? {
      // For admins: show all active items
      isActive: true
    } : {
      // For non-admins: apply role-based filtering
      isActive: true,
      OR: [
        // Items with role-specific access for this user's role
        {
          roleAccess: {
            some: {
              hasAccess: true,
              role: { name: userRole },
            },
          },
        },
        // Items accessible to all (no specific role restrictions)
        {
          roleAccess: {
            none: {},
          },
        }
      ]
    };

    const groups = await prisma.sidebarGroup.findMany({
      where: groupWhereClause,
      include: {
        roleAccess: {
          include: {
            role: { select: { id: true, name: true } }
          }
        },
        items: {
          where: itemWhereClause,
          include: {
            roleAccess: {
              include: {
                role: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { position: "asc" },
        },
      },
      orderBy: { position: "asc" },
    });

    // Transform the data
    const shaped = groups.map((g) => ({
      id: g.id,
      title: g.title,
      position: g.position,
      isActive: g.isActive,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
      roleAccess: g.roleAccess.map((ra) => ({
        roleId: ra.roleId,
        hasAccess: ra.hasAccess,
        roleName: ra.role.name,
      })),
      items: g.items.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        position: item.position,
        isActive: item.isActive,
        sidebarGroupId: item.sidebarGroupId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        roleAccess: item.roleAccess.map((ra) => ({
          roleId: ra.roleId,
          hasAccess: ra.hasAccess,
          roleName: ra.role.name,
        })),
      })),
    }));

    // Filter out groups that have no items (only for non-admins)
    const filtered = isAdmin 
      ? shaped // Admins see all groups, even empty ones
      : shaped.filter(group => group.items.length > 0 && group.isActive === true);

    return NextResponse.json({ 
      data: filtered,
      meta: {
        userRole: userRole,
        userEmail: token.email,
        isAdmin: isAdmin,
        totalGroups: filtered.length,
        totalItems: filtered.reduce((sum, group) => sum + group.items.length, 0),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error fetching sidebar:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to fetch sidebar configuration",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}