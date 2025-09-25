import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import cloudinary from "@/lib/cloudinary";
import { ThemeMode, Prisma } from "@prisma/client";
import { UploadApiResponse } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

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

// GET /api/theme - Get current theme
export async function GET() {
  try {
    // Ensure there is exactly one theme and prefer the singleton id
    const SINGLETON_ID = "singleton";

    // Prefer existing singleton
    let base = await prisma.theme.findUnique({ where: { id: SINGLETON_ID } });

    // If no singleton, take earliest theme (if any)
    const all = base ? [] : await prisma.theme.findMany({ orderBy: { createdAt: 'asc' } });
    if (!base) {
      if (all.length === 0) {
        // Create default singleton
        base = await prisma.theme.create({
          data: {
            id: SINGLETON_ID,
            themeName: "Prabisha Consulting",
            primaryColor: "#111CA8",
            secondaryColor: "#DE6A2C",
            tertiaryColor: "#8b5cf6",
            font: "Montserrat",
            backgroundColor: "#ffffff",
            textColor: "#000000",
            mode: "LIGHT",
          },
        });
      } else {
        // Promote earliest to singleton id
        const earliest = all[0];
        if (earliest.id !== SINGLETON_ID) {
          await prisma.theme.update({ where: { id: earliest.id }, data: { id: SINGLETON_ID } });
        }
        base = await prisma.theme.findUnique({ where: { id: SINGLETON_ID } });
        // Remove any extras beyond the promoted record
        const toDelete = all.slice(1).map(t => t.id);
        if (toDelete.length) {
          await prisma.theme.deleteMany({ where: { id: { in: toDelete } } });
        }
      }
    } else {
      // If singleton exists, optionally cleanup any others
      const others = await prisma.theme.findMany({ where: { NOT: { id: SINGLETON_ID } } });
      if (others.length) {
        await prisma.theme.deleteMany({ where: { id: { in: others.map(t => t.id) } } });
      }
    }

    return NextResponse.json({ data: base });
  } catch (error) {
    console.error("Error fetching theme:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/theme - Update theme (supports JSON partial update or multipart form)
export async function PUT(req: NextRequest) {
  try {
    const authError = await checkAuth(req);
    if (authError) return authError;

    const contentType = req.headers.get("content-type") || "";

    // Helper to fetch or create base theme when needed
    const getOrCreateBaseTheme = async () => {
      let base = await prisma.theme.findFirst();
      if (!base) {
        base = await prisma.theme.create({
          data: {
            themeName: "Prabisha Theme",
            primaryColor: "#111CA8",
            secondaryColor: "#DE6A2C",
            tertiaryColor: "#8b5cf6",
            font: "inter",
            backgroundColor: "#ffffff",
            textColor: "#000000",
            mode: "LIGHT",
          },
        });
      }
      return base;
    };

    // JSON partial update: e.g., { mode: "DARK" }
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const updateData: Prisma.ThemeUpdateInput = {};

      if (body.mode) {
        const upper = String(body.mode).toUpperCase();
        if (!(["LIGHT", "DARK", "SYSTEM"].includes(upper))) {
          return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
        }
        updateData.mode = upper as ThemeMode;
      }

      // No fields to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
      }

      const base = await getOrCreateBaseTheme();
      const updated = await prisma.theme.update({
        where: { id: base.id },
        data: updateData,
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Multipart form: handle full or partial update with optional file uploads
    const formData = await req.formData();

    // Extract form data
    const themeName = formData.get("themeName") as string | null;
    const primaryColor = formData.get("primaryColor") as string | null;
    const secondaryColor = formData.get("secondaryColor") as string | null;
    const tertiaryColor = formData.get("tertiaryColor") as string | null;
    const font = formData.get("font") as string | null;
    const backgroundColor = formData.get("backgroundColor") as string | null;
    const textColor = formData.get("textColor") as string | null;
    const mode = formData.get("mode") as string | null;

    const logoFile = formData.get("logo") as File | null;
    const faviconFile = formData.get("favicon") as File | null;

    let logoUrl: string | undefined;
    let faviconUrl: string | undefined;

    if (logoFile && logoFile.size > 0) {
      const bytes = await logoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(buffer);
      });
      logoUrl = (uploadResult as UploadApiResponse).secure_url;
    }

    if (faviconFile && faviconFile.size > 0) {
      const bytes = await faviconFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              resource_type: "auto",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            },
          )
          .end(buffer);
      });
      faviconUrl = (uploadResult as UploadApiResponse).secure_url;
    }

    const SINGLETON_ID = "singleton";
    const existingTheme = await prisma.theme.findUnique({ where: { id: SINGLETON_ID } });
    const updateData: Prisma.ThemeUpdateInput = {};
    if (themeName) updateData.themeName = themeName;
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (secondaryColor) updateData.secondaryColor = secondaryColor;
    if (tertiaryColor) updateData.tertiaryColor = tertiaryColor;
    if (font) updateData.font = font;
    if (backgroundColor) updateData.backgroundColor = backgroundColor;
    if (textColor) updateData.textColor = textColor;
    if (mode) updateData.mode = (mode.toUpperCase() as ThemeMode);
    if (logoUrl) updateData.logoUrl = logoUrl;
    if (faviconUrl) updateData.faviconUrl = faviconUrl;

    let theme;
    if (existingTheme) {
      theme = await prisma.theme.update({
        where: { id: SINGLETON_ID },
        data: updateData,
      });
    } else {
      // Create singleton with provided fields + sensible defaults
      theme = await prisma.theme.create({
        data: {
          id: SINGLETON_ID,
          themeName: themeName || "Prabisha Consulting",
          primaryColor: primaryColor || "#111CA8",
          secondaryColor: secondaryColor || "#DE6A2C",
          tertiaryColor: tertiaryColor || "#8b5cf6",
          font: font || "Montserrat",
          backgroundColor: backgroundColor || "#ffffff",
          textColor: textColor || "#000000",
          mode: (mode ? (mode.toUpperCase() as ThemeMode) : "LIGHT"),
          logoUrl,
          faviconUrl,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: theme,
    });
  } catch (error: unknown) {
    console.error("Error updating theme:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/site-settings/theme - Mirror PUT to avoid infra blocking PUT
export async function POST(request: NextRequest) {
  // Delegate to PUT handler to keep logic in one place
  return PUT(request);
}