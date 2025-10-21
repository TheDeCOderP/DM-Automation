import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

// GET - Fetch all external blog sites for user's brands
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    // Get user with their brands
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        brands: {
          include: {
            brand: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userBrandIds = user.brands.map(ub => ub.brandId);

    // Build where clause
    const where: any = {
      brandId: { in: userBrandIds }
    };

    if (brandId && userBrandIds.includes(brandId)) {
      where.brandId = brandId;
    }

    const externalSites = await prisma.externalBlogSite.findMany({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            logo: true
          }
        },
        _count: {
          select: {
            blogPosts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ externalSites });
  } catch (error) {
    console.error('Error fetching external blog sites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new external blog site
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
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

    // Validate that user has access to this brand
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

    // Create the external blog site
    const externalSite = await prisma.externalBlogSite.create({
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
        brandId,
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

    return NextResponse.json({ externalSite }, { status: 201 });
  } catch (error) {
    console.error('Error creating external blog site:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}