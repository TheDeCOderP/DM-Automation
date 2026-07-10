import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { insertBlogRow } from '@/lib/external-db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.CRON_SECRET_TOKEN || 'gdfgvdfgfdbfdhgfbbfghfbfhfgbhffhffbdfgdfdffg';
  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  console.log(`[BLOG-CRON] Starting at ${now.toISOString()}`);

  const scheduled = await prisma.blogAutomation.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: now },
      dbConnectionId: { not: null },
    },
    include: { dbConnection: true, brand: { select: { name: true, website: true } } },
    orderBy: { scheduledAt: 'asc' },
    take: 30,
  });

  console.log(`[BLOG-CRON] Found ${scheduled.length} blogs to publish`);

  const results = { success: [] as string[], failed: [] as { id: string; error: string }[] };

  for (const automation of scheduled) {
    const conn = automation.dbConnection!;
    try {
      const fieldMapping = (conn.fieldMapping as Record<string, string>) || {};

      const plainText = automation.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      const wordCount = plainText.split(' ').filter(Boolean).length;
      const readingTime = Math.ceil(wordCount / 200);
      const structuredData = JSON.stringify({
        '@context': 'https://schema.org', '@type': 'Article',
        headline: automation.title, description: automation.excerpt || '',
        author: { '@type': 'Organization', name: (automation as any).brand?.name || '' },
        datePublished: now.toISOString(),
        image: automation.bannerUrl || '',
        articleSection: (automation as any).articleSection || '',
        wordCount, keywords: automation.seoKeywords || '',
      });

      const effectiveSlug = automation.slug || automation.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const brandWebsite = (automation as any).brand?.website as string | undefined;
      const generatedCanonicalUrl = !automation.canonicalUrl && brandWebsite
        ? `${brandWebsite.replace(/\/$/, '')}/blogs/${effectiveSlug}`
        : automation.canonicalUrl || undefined;

      const result = await insertBlogRow(
        { dbType: conn.dbType, host: conn.host, port: conn.port, database: conn.database, username: conn.username, password: conn.password, ssl: conn.ssl },
        conn.blogTable,
        fieldMapping,
        {
          title: automation.title,
          slug: effectiveSlug,
          content: automation.content,
          excerpt: automation.excerpt || undefined,
          featuredImage: automation.bannerUrl || undefined,
          imageAlt: automation.title,
          tags: Array.isArray(automation.tags) ? (automation.tags as string[]).join(', ') : undefined,
          faqs: (automation as any).faqs || undefined,
          articleSection: (automation as any).articleSection || undefined,
          structuredData, wordCount, readingTime,
          author: (automation as any).brand?.name || undefined,
          isFeatured: false,
          seoTitle: automation.seoTitle || undefined,
          seoDescription: automation.seoDescription || undefined,
          seoKeywords: automation.seoKeywords || undefined,
          canonicalUrl: generatedCanonicalUrl,
          isPublished: true,
          publishedAt: now.toISOString().slice(0, 19).replace('T', ' '),
        },
        {
          categoryNames: Array.isArray((automation as any).selectedCategories) ? (automation as any).selectedCategories as string[] : [],
          industryNames: Array.isArray((automation as any).selectedIndustries) ? (automation as any).selectedIndustries as string[] : [],
        }
      );

      await prisma.blogAutomation.update({
        where: { id: automation.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          externalId: String(result.id),
          errorMessage: null,
          ...(generatedCanonicalUrl && !automation.canonicalUrl ? { canonicalUrl: generatedCanonicalUrl } : {}),
        },
      });

      results.success.push(automation.id);
      console.log(`[BLOG-CRON] ✓ Published blog ${automation.id} → external ID ${result.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await prisma.blogAutomation.update({
        where: { id: automation.id },
        data: { status: 'FAILED', errorMessage: msg, retryCount: { increment: 1 } },
      });
      results.failed.push({ id: automation.id, error: msg });
      console.error(`[BLOG-CRON] ✗ Failed blog ${automation.id}:`, msg);
    }
  }

  console.log(`[BLOG-CRON] Done: ${results.success.length} success, ${results.failed.length} failed`);

  return NextResponse.json({
    success: true,
    processed: scheduled.length,
    successCount: results.success.length,
    failedCount: results.failed.length,
    results,
  });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
