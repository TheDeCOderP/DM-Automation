import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function getAutomationAndVerify(id: string, userId: string) {
  const automation = await prisma.blogAutomation.findUnique({
    where: { id },
    include: {
      brand: { include: { members: true } },
      dbConnection: { select: { id: true, name: true, dbType: true, host: true } },
      calendar: { select: { id: true, title: true } },
    },
  });
  if (!automation) return null;
  const isMember = automation.brand.members.some(m => m.userId === userId);
  return isMember ? automation : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const automation = await getAutomationAndVerify(id, token.id);
  if (!automation) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ automation });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getAutomationAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const {
    title, slug, content, excerpt, tags,
    seoTitle, seoDescription, seoKeywords, canonicalUrl,
    bannerUrl, bannerPrompt,
    dbConnectionId, scheduledAt, status,
    articleSection, faqs, selectedCategories, selectedIndustries,
  } = body;

  const updated = await prisma.blogAutomation.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(content !== undefined && { content }),
      ...(excerpt !== undefined && { excerpt }),
      ...(tags !== undefined && { tags }),
      ...(seoTitle !== undefined && { seoTitle }),
      ...(seoDescription !== undefined && { seoDescription }),
      ...(seoKeywords !== undefined && { seoKeywords }),
      ...(canonicalUrl !== undefined && { canonicalUrl }),
      ...(bannerUrl !== undefined && { bannerUrl }),
      ...(bannerPrompt !== undefined && { bannerPrompt }),
      ...(dbConnectionId !== undefined && { dbConnectionId: dbConnectionId || null }),
      ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
      ...(status !== undefined && { status }),
      ...(articleSection !== undefined && { articleSection: articleSection || null }),
      ...(faqs !== undefined && { faqs: faqs || null }),
      ...(selectedCategories !== undefined && { selectedCategories: selectedCategories || [] }),
      ...(selectedIndustries !== undefined && { selectedIndustries: selectedIndustries || [] }),
    },
  });

  return NextResponse.json({ automation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const existing = await getAutomationAndVerify(id, token.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.blogAutomation.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
