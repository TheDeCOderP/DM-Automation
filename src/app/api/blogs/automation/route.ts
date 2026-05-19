import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const brandId = searchParams.get('brandId');
  const status = searchParams.get('status');
  const calendarId = searchParams.get('calendarId');

  if (!brandId) return NextResponse.json({ error: 'brandId required' }, { status: 400 });

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const automations = await prisma.blogAutomation.findMany({
    where: {
      brandId,
      ...(status && { status: status as any }),
      ...(calendarId && { calendarId }),
    },
    include: {
      dbConnection: { select: { id: true, name: true, dbType: true } },
      calendar: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    brandId, title, slug, content, excerpt, tags,
    seoTitle, seoDescription, seoKeywords, canonicalUrl,
    bannerUrl, bannerPrompt,
    dbConnectionId, scheduledAt,
  } = body;

  if (!brandId || !title || !content) {
    return NextResponse.json({ error: 'brandId, title, and content are required' }, { status: 400 });
  }

  const userBrand = await prisma.userBrand.findFirst({ where: { userId: token.id, brandId } });
  if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const automation = await prisma.blogAutomation.create({
    data: {
      brandId, title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now(),
      content, excerpt,
      tags: tags || [],
      seoTitle, seoDescription, seoKeywords, canonicalUrl,
      bannerUrl, bannerPrompt,
      dbConnectionId: dbConnectionId || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
    },
  });

  return NextResponse.json({ automation }, { status: 201 });
}
