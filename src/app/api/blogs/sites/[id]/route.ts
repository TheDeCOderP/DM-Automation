import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'No site ID provided' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email!  }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      platform,
      baseUrl,
      apiEndpoint,
      apiKey,
      secretKey,
      username,
      authType,
      contentType,
      config,
      brandId
    } = body;

    // Check if the site exists and user has access to it
    const existingSite = await prisma.externalBlogSite.findFirst({
      where: {
        id,
      }
    });

    if (!existingSite) {
      return NextResponse.json(
        { error: 'Site not found or you do not have access to it' },
        { status: 404 }
      );
    }

    // Validate that user has access to the new brand (if changing)
    if (brandId && brandId !== existingSite.brandId) {
      const userBrand = await prisma.userBrand.findFirst({
        where: {
          userId: user.id,
          brandId: brandId
        }
      });

      if (!userBrand) {
        return NextResponse.json(
          { error: 'You do not have access to this brand' },
          { status: 403 }
        );
      }
    }

    // Update the external blog site
    const updatedSite = await prisma.externalBlogSite.update({
      where: { id },
      data: {
        name,
        platform,
        baseUrl,
        apiEndpoint,
        apiKey,
        secretKey,
        username,
        authType: authType || 'API_KEY',
        contentType: contentType || 'application/json',
        config: config || {},
        brandId: brandId || existingSite.brandId,
        updatedAt: new Date()
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        }
      }
    });

    return NextResponse.json({ externalSite: updatedSite });
  } catch (error) {
    console.error('Error updating external blog site:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const { id } = await context.params;
    if(!id) throw new Error('No site ID provided');

    const site = await prisma.externalBlogSite.findUnique({ where: { id } });
    if(!site) throw new Error(`Site with ID ${id} not found`);

    await prisma.externalBlogSite.delete({
      where: { id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting site:", error);
    return new NextResponse(JSON.stringify({ error }), { status: 500 });
  }
}