import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { Platform, Status, MediaType } from '@prisma/client';

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    const userId = token?.id;
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Search across multiple models with user permission checks
    const [posts, media, brands] = await Promise.all([
      // Search posts
      prisma.post.findMany({
        where: {
          userId,
          OR: [
            { content: { contains: query } },
            // For enum fields, we need to check if the query matches any enum values
            ...(Object.values(Platform).includes(query.toUpperCase() as Platform) 
              ? [{ platform: query.toUpperCase() as Platform }] 
              : []),
            ...(Object.values(Status).includes(query.toUpperCase() as Status) 
              ? [{ status: query.toUpperCase() as Status }] 
              : [])
          ]
        },
        take: limit,
        select: {
          id: true,
          content: true,
          platform: true,
          status: true,
          createdAt: true
        }
      }),
      // Search media
      prisma.media.findMany({
        where: {
          userId,
          OR: [
            { url: { contains: query } },
            // For MediaType enum
            ...(Object.values(MediaType).includes(query.toUpperCase() as MediaType) 
              ? [{ type: query.toUpperCase() as MediaType }] 
              : [])
          ]
        },
        take: limit,
        select: {
          id: true,
          url: true,
          type: true,
          createdAt: true
        }
      }),
      // Search brands the user has access to
      prisma.brand.findMany({
        where: {
          deleted: false,
          members: {
            some: { userId }
          },
          OR: [
            { name: { contains: query } },
            { description: { contains: query } },
            { website: { contains: query } }
          ]
        },
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          website: true
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        posts,
        media,
        brands
      }
    });
  } catch (error) {
    console.error('[SEARCH_ERROR]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}