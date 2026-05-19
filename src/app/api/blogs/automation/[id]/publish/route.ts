import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { insertBlogRow } from '@/lib/external-db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const automation = await prisma.blogAutomation.findUnique({
    where: { id },
    include: {
      brand: { select: { name: true, members: { select: { userId: true } } } },
      dbConnection: true,
    },
  });

  if (!automation || !automation.brand.members.some(m => m.userId === token.id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!automation.dbConnection) {
    return NextResponse.json({ error: 'No database connection linked to this blog post' }, { status: 400 });
  }

  try {
    const conn = automation.dbConnection;
    const fieldMapping = (conn.fieldMapping as Record<string, string>) || {};

    // Calculate word count and reading time from HTML content
    const plainText = automation.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const wordCount = plainText.split(' ').filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);

    // Build JSON-LD structured data
    const publishedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const structuredData = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: automation.title,
      description: automation.excerpt || '',
      author: { '@type': 'Organization', name: automation.brand.name },
      datePublished: new Date().toISOString(),
      image: automation.bannerUrl || '',
      articleSection: (automation as any).articleSection || '',
      wordCount,
      keywords: automation.seoKeywords || '',
    });

    const result = await insertBlogRow(
      { dbType: conn.dbType, host: conn.host, port: conn.port, database: conn.database, username: conn.username, password: conn.password, ssl: conn.ssl },
      conn.blogTable,
      fieldMapping,
      {
        title: automation.title,
        slug: automation.slug || automation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        content: automation.content,
        excerpt: automation.excerpt || undefined,
        featuredImage: automation.bannerUrl || undefined,
        imageAlt: automation.title,
        tags: Array.isArray(automation.tags) ? (automation.tags as string[]).join(', ') : undefined,
        faqs: (automation as any).faqs || undefined,
        articleSection: (automation as any).articleSection || undefined,
        structuredData,
        wordCount,
        readingTime,
        author: automation.brand.name,
        isFeatured: false,
        seoTitle: automation.seoTitle || undefined,
        seoDescription: automation.seoDescription || undefined,
        seoKeywords: automation.seoKeywords || undefined,
        canonicalUrl: automation.canonicalUrl || undefined,
        isPublished: true,
        publishedAt,
      },
      {
        categoryNames: Array.isArray((automation as any).selectedCategories) ? (automation as any).selectedCategories as string[] : [],
        industryNames: Array.isArray((automation as any).selectedIndustries) ? (automation as any).selectedIndustries as string[] : [],
      }
    );

    await prisma.blogAutomation.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        externalId: String(result.id),
        errorMessage: null,
      },
    });

    return NextResponse.json({ success: true, externalId: result.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Publish failed';

    await prisma.blogAutomation.update({
      where: { id },
      data: {
        status: 'FAILED',
        errorMessage: msg,
        retryCount: { increment: 1 },
      },
    });

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
