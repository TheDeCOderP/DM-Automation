import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

async function checkAuth(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { email: token.email! }, include: { role: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!["ADMIN", "SUPERADMIN"].includes(user.role.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}


// ✅ GET all header items AND site config for header features
export async function GET() {
  try {
    const headers = await prisma.headerItem.findMany({
      include: { subHeaderItems: true },
      orderBy: { position: "asc" },
    });

    const config = await prisma.siteConfig.findFirst({
      select: {
        headerSearchEnabled: true,
        headerNotificationsEnabled: true,
        headerThemeToggleEnabled: true,
        headerLanguageEnabled: true,
      }
    });

    return NextResponse.json({ headers, config });
  } catch (error) {
    console.error("Error fetching header settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ CREATE a new header item
export async function POST(request: NextRequest) {
  try {
    const { label, href, icon, position, isActive } = await request.json();

    const newHeader = await prisma.headerItem.create({
      data: {
        label,
        href,
        icon,
        position,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json({ data: newHeader }, { status: 201 });
  } catch (error) {
    console.error("Error creating header item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ UPDATE a header item
export async function PUT(request: NextRequest) {
  try {
    const { id, label, href, icon, position, isActive } = await request.json();

    const updatedHeader = await prisma.headerItem.update({
      where: { id },
      data: {
        label,
        href,
        icon,
        position,
        isActive,
      },
    });

    return NextResponse.json({ data: updatedHeader });
  } catch (error) {
    console.error("Error updating header item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ DELETE a header item
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const deletedHeader = await prisma.headerItem.delete({
      where: { id },
    });

    return NextResponse.json({ data: deletedHeader });
  } catch (error) {
    console.error("Error deleting header item:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ✅ UPDATE header feature toggles
export async function PATCH(request: NextRequest) {
  try {
    const authCheck = await checkAuth(request);
    if(authCheck) return authCheck;

    const body = await request.json();
    const { 
      headerSearchEnabled, 
      headerNotificationsEnabled, 
      headerThemeToggleEnabled, 
      headerLanguageEnabled 
    } = body;

    const existingConfig = await prisma.siteConfig.findFirst();
    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    const updatedConfig = await prisma.siteConfig.update({
      where: { id: existingConfig.id },
      data: {
        ...(headerSearchEnabled !== undefined ? { headerSearchEnabled } : {}),
        ...(headerNotificationsEnabled !== undefined ? { headerNotificationsEnabled } : {}),
        ...(headerThemeToggleEnabled !== undefined ? { headerThemeToggleEnabled } : {}),
        ...(headerLanguageEnabled !== undefined ? { headerLanguageEnabled } : {}),
      },
    });

    return NextResponse.json({ data: updatedConfig });

  } catch (error) {
    console.error("Error updating header features:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}