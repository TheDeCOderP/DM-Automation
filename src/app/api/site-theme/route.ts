// Alias endpoint for /api/site-settings/theme
// This provides backward compatibility for components using /api/site-theme

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/site-theme
 * Returns the current site theme configuration
 * This is an alias for /api/site-settings/theme for backward compatibility
 */
export async function GET() {
  try {
    const SINGLETON_ID = "singleton";

    // Try to get singleton theme
    let theme = await prisma.theme.findUnique({ 
      where: { id: SINGLETON_ID } 
    });

    // If no singleton exists, get the first theme or create default
    if (!theme) {
      const allThemes = await prisma.theme.findMany({ 
        orderBy: { createdAt: 'asc' } 
      });

      if (allThemes.length === 0) {
        // Create default theme
        theme = await prisma.theme.create({
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
        // Use first theme
        theme = allThemes[0];
        
        // Promote to singleton if needed
        if (theme.id !== SINGLETON_ID) {
          await prisma.theme.update({ 
            where: { id: theme.id }, 
            data: { id: SINGLETON_ID } 
          });
          theme = await prisma.theme.findUnique({ 
            where: { id: SINGLETON_ID } 
          });
        }

        // Clean up extra themes
        const toDelete = allThemes.slice(1).map(t => t.id);
        if (toDelete.length > 0) {
          await prisma.theme.deleteMany({ 
            where: { id: { in: toDelete } } 
          });
        }
      }
    } else {
      // Clean up any non-singleton themes
      const others = await prisma.theme.findMany({ 
        where: { NOT: { id: SINGLETON_ID } } 
      });
      
      if (others.length > 0) {
        await prisma.theme.deleteMany({ 
          where: { id: { in: others.map(t => t.id) } } 
        });
      }
    }

    return NextResponse.json({ 
      success: true,
      data: theme 
    });
  } catch (error) {
    console.error("Error fetching site theme:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch site theme",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 
      { status: 500 }
    );
  }
}

/**
 * PUT /api/site-theme
 * Updates the site theme
 * Redirects to /api/site-settings/theme for actual implementation
 */
export async function PUT(req: NextRequest) {
  // Redirect to the main theme API
  const url = new URL('/api/site-settings/theme', req.url);
  return NextResponse.redirect(url, { status: 307 });
}

/**
 * POST /api/site-theme
 * Updates the site theme (alternative to PUT)
 * Redirects to /api/site-settings/theme for actual implementation
 */
export async function POST(req: NextRequest) {
  // Redirect to the main theme API
  const url = new URL('/api/site-settings/theme', req.url);
  return NextResponse.redirect(url, { status: 307 });
}
