import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { generateSequentialId } from "@/lib/id-generator";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page") ?? "1";
    const per_page = searchParams.get("per_page") ?? "10";
    const sort = searchParams.get("sort");
    const name = searchParams.get("name");

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const perPageNum = parseInt(per_page);

    const user = await prisma.user.findUnique({
      where: {
        id: token.id,
      },
      include:{
        role: true
      }
    })
    
    if(user?.role.name != "SUPERADMIN"){
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    if (isNaN(perPageNum) || perPageNum < 1 || perPageNum > 100) {
      return new NextResponse("Bad Request", { status: 400 });
    }

    const where: Prisma.RoleWhereInput = {};

    if (name) {
      where.name = { contains: name };
    }

    const [column, order] = sort?.split(".") ?? ["name", "asc"];
    
    // Validate sort column
    const validColumns = ["name", "createdAt", "updatedAt"];
    if (!validColumns.includes(column)) {
      return new NextResponse("Invalid sort column", { status: 400 });
    }

    // Validate sort order
    if (order && !["asc", "desc"].includes(order)) {
      return new NextResponse("Invalid sort order", { status: 400 });
    }

    const [total, roles, permissions] = await Promise.all([
      prisma.role.count({ where }),
      prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          users: { select: { id: true } },
        },
        orderBy: { [column]: order },
        skip: (pageNum - 1) * perPageNum,
        take: perPageNum,
      }),
      prisma.permission.findMany({ orderBy: { name: "asc" } })
    ]);

    const pageCount = Math.ceil(total / perPageNum);

    const transformedRoles = roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions.map((rp) => rp.permission.name),
      userCount: r.users.length,
    }));

    return NextResponse.json({
      roles: transformedRoles,
      permissions,
      pageCount,
      total,
      currentPage: pageNum,
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching roles:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if(!token) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const body = await req.json();
    const { name, permissions } = body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new NextResponse("Name is required", { status: 400 });
    }

    // Validate name length
    if (name.length > 100) {
      return new NextResponse("Name cannot exceed 100 characters", { status: 400 });
    }

    // Check if role name already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() }
    });

    if (existingRole) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 409 }
      );
    }

    let validPermissions: string[] = [];
    if (permissions && Array.isArray(permissions)) {
      // Validate permissions array
      if (!permissions.every(p => typeof p === 'string')) {
        return NextResponse.json("Permissions must be an array of strings", { status: 400 });
      }
      validPermissions = permissions;
    }

    const perms = await prisma.permission.findMany({
      where: { name: { in: validPermissions } }
    });

    // Generate sequential role ID like PCR-0001
    const newRoleId: string = await generateSequentialId("PCR");

    const created = await prisma.role.create({
      data: {
        id: newRoleId,
        name: name.trim(),
        permissions: {
          createMany: {
            data: perms.map((p) => ({ permissionId: p.id })),
            skipDuplicates: true,
          },
        },
      },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    const transformedRole = {
      id: created.id,
      name: created.name,
      permissions: created.permissions.map((rp) => rp.permission.name),
    };

    return NextResponse.json(transformedRole, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Role with this name already exists" },
        { status: 409 }
      );
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}