import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, SidebarSpacingPreset, AccordionMode, SidebarIconSize } from "@prisma/client";

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

// GET /api/site-settings/sidebar/settings - get singleton settings
export async function GET() {
  try {
    const id = "singleton";
    let settings = await prisma.sidebarSettings.findUnique({ where: { id } });
    if (!settings) {
      settings = await prisma.sidebarSettings.create({
        data: {
          id,
          spacingPreset: "MD",
          accordionMode: "SINGLE",
          compact: false,
          showGroupTitles: true,
          iconSize: "MD",
        },
      });
    }
    return NextResponse.json({ data: settings });
  } catch (e) {
    console.error("GET sidebar settings error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/site-settings/sidebar/settings - update singleton settings
export async function PUT(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const body = await req.json();
    const id = "singleton";

    const data: Prisma.SidebarSettingsUpdateInput = {};
    if (body.spacingPreset) data.spacingPreset = String(body.spacingPreset).toUpperCase() as SidebarSpacingPreset;
    if (body.spacingPx !== undefined) data.spacingPx = Number(body.spacingPx);
    if (body.accordionMode) data.accordionMode = String(body.accordionMode).toUpperCase() as AccordionMode;
    if (body.defaultOpenGroupIds !== undefined) data.defaultOpenGroupIds = body.defaultOpenGroupIds;
    if (body.compact !== undefined) data.compact = Boolean(body.compact);
    if (body.showGroupTitles !== undefined) data.showGroupTitles = Boolean(body.showGroupTitles);
    if (body.iconSize) data.iconSize = String(body.iconSize).toUpperCase() as SidebarIconSize;

    const updated = await prisma.sidebarSettings.upsert({
      where: { id },
      create: { ...data as Prisma.SidebarSettingsCreateInput },
      update: data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("PUT sidebar settings error", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}