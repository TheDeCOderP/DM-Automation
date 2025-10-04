import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const ItemCreateSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  icon: z.string().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  sidebarGroupId: z.string().min(1),
  roleIds: z.array(z.string()).optional(),
});

const ItemUpdateSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).optional(),
  href: z.string().min(1).optional(),
  icon: z.string().optional().nullable(),
  position: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sidebarGroupId: z.string().min(1).optional(),
  roleIds: z.array(z.string()).optional(),
});

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
  try {
    const { searchParams } = new URL(req.url);
    const sidebarGroupId = searchParams.get("sidebarGroupId") || undefined;

    const items = await prisma.sidebarItem.findMany({
      where: { sidebarGroupId },
      include: {
        sidebarGroup: true,
        roleAccess: {
          select: {
            roleId: true,
            hasAccess: true,
            role: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { position: "asc" },
    });

    const shaped = items.map((item) => ({
      ...item,
      roleAccess: (item.roleAccess || []).map((ra) => ({
        roleId: ra.roleId,
                    hasAccess: ra.hasAccess,
        role: ra.role?.name || ra.roleId,
      })),
    }));

    return NextResponse.json({ data: shaped });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { roleIds, ...payload } = ItemCreateSchema.parse(body);

    const created = await prisma.sidebarItem.create({
      data: {
        ...payload,
        icon: payload.icon ?? null,
        position: payload.position ?? 0,
        isActive: payload.isActive ?? true,
        roleAccess: {
          create: roleIds?.map(roleId => ({ roleId, hasAccess: true })) || [],
        },
      },
      include: { roleAccess: true },
    });

    try {
      await logAudit({
        action: "SIDEBAR_ITEM_CREATED",
        resource: "/api/site-settings/sidebar/items",
        metadata: {
          id: created.id,
          label: created.label,
          href: created.href,
          roleIds,
        },
      });
    } catch (auditError) {
      console.warn("Audit logging failed:", auditError);
    }

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const { id, roleIds, ...rest } = ItemUpdateSchema.parse(body);

    await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.sidebarItem.update({
        where: { id },
        data: rest,
      });

      if (roleIds !== undefined) {
        await tx.sidebarItemAccess.deleteMany({
          where: { sidebarItemId: id },
        });
        if (roleIds.length > 0) {
          await tx.sidebarItemAccess.createMany({
            data: roleIds.map((roleId) => ({
              sidebarItemId: id,
              roleId,
              hasAccess: true,
            })),
          });
        }
      }
      return updatedItem;
    });

    const fresh = await prisma.sidebarItem.findUnique({
      where: { id },
      include: { roleAccess: true },
    });

    try {
      await logAudit({ action: "SIDEBAR_ITEM_UPDATED", resource: "/api/site-settings/sidebar/items", metadata: { id, data: rest, roleIds } });
    } catch (auditError) {
      console.warn("Audit logging failed:", auditError);
    }

    return NextResponse.json({ data: fresh });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const { id } = z.object({ id: z.string().min(1) }).parse(await req.json());

    const deleted = await prisma.sidebarItem.delete({ where: { id } });

    try {
      await logAudit({ action: "SIDEBAR_ITEM_DELETED", resource: "/api/site-settings/sidebar/items", metadata: { id: deleted.id, label: deleted.label, href: deleted.href } });
    } catch (auditError) {
      console.warn("Audit logging failed:", auditError);
    }

    return NextResponse.json({ data: deleted });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 400 });
  }
}