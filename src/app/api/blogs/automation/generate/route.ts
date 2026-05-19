import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { generateWithThinking, GEMINI_MODELS } from '@/lib/gemini';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

async function generateBlogContent(
  topic: string,
  brandName: string,
  brandDescription?: string | null,
  options?: { tone?: string; targetAudience?: string; keywords?: string }
): Promise<{ title: string; slug: string; excerpt: string; content: string; tags: string; faqs: string; articleSection: string; seoTitle: string; seoDescription: string; seoKeywords: string; imagePrompt: string }> {
  const toneNote = options?.tone ? `\nTone/Voice: ${options.tone}` : '';
  const audienceNote = options?.targetAudience ? `\nTarget Audience: ${options.targetAudience}` : '';
  const keywordNote = options?.keywords ? `\nPrimary Keywords to target: ${options.keywords}` : '';
  const brandContext = brandDescription ? `\nBrand Description: ${brandDescription}` : '';

  const prompt = `You are a world-class content strategist and senior blog writer with 15+ years of experience crafting high-ranking, authoritative content for Fortune 500 companies and global consulting firms. You have written for brands like McKinsey & Company, Deloitte, Accenture, IBM, Salesforce, HubSpot, Google, Microsoft, and Amazon. Your articles consistently rank on Page 1 of Google and drive millions of organic visits.

You are now writing a premium blog post for "${brandName}" — a brand that demands the same calibre of content as the world's leading consultancies and tech companies.
${brandContext}${toneNote}${audienceNote}${keywordNote}

BLOG TOPIC: "${topic}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING STANDARDS (non-negotiable):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTENT QUALITY:
- Write like a McKinsey insights report meets a viral HubSpot blog — authoritative yet engaging
- Back claims with real-world examples from companies like Apple, Tesla, Amazon, Google, Microsoft, Meta, Salesforce, Deloitte, PwC, Accenture, IBM, or Netflix where relevant
- Include specific statistics, percentages, and data points (cite source type e.g. "According to a Gartner report...")
- Use storytelling techniques: open with a compelling hook (a surprising stat, a bold statement, or a relatable scenario)
- Every section must deliver actionable, practical value — no fluff, no filler
- Write at least 1,200 words of rich, in-depth content

STRUCTURE (HTML only — no markdown):
- Start with a powerful <p> hook paragraph (no heading before it)
- Use <h2> for major sections (4-6 sections minimum)
- Use <h3> for sub-points within sections
- Use <p> for body paragraphs (2-4 sentences each, scannable)
- Use <ul> or <ol> for lists (max 5-7 bullet points per list)
- Use <strong> to bold key terms, stats, and power phrases
- Use <blockquote> for impactful quotes or standout stats
- Add a <h2>Key Takeaways</h2> section at the end with a <ul> summary
- Close with a strong <h2>Final Thoughts</h2> CTA paragraph
- Output PURE HTML only — absolutely no markdown, no backticks, no code fences

SEO REQUIREMENTS:
- Title: Click-worthy, keyword-rich, 50-60 characters (think: "How [Company] Does X" or "X Ways to Y in [Year]")
- Naturally weave the primary keyword into the first 100 words
- Use LSI/semantic keywords throughout (don't keyword-stuff)
- SEO title: 50-60 chars, front-load the primary keyword
- Meta description: 150-160 chars, include a benefit + CTA ("Learn how...", "Discover...")
- Keywords: 6-10 comma-separated terms ordered by relevance

IMAGE PROMPT:
- Describe a cinematic, ultra-realistic image optimised for a 1200×630 px blog banner (standard OG image size, wide landscape)
- Reference specific visual styles: "editorial photography", "flat lay", "isometric illustration", "data visualization dashboard"
- Specify mood, lighting, colour palette, and composition
- Ensure the subject sits centre-left so text can overlay on the right side without clashing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — return ONLY this exact JSON (no extra text):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "content": "<p>Hook...</p><h2>...</h2><p>...</p>...<h2>Key Takeaways</h2><ul>...</ul><h2>Final Thoughts</h2><p>...</p>",
  "tags": "tag1, tag2, tag3, tag4, tag5",
  "faqs": "[{\"question\":\"Q1?\",\"answer\":\"A1.\"},{\"question\":\"Q2?\",\"answer\":\"A2.\"}]",
  "articleSection": "Digital Marketing",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "imagePrompt": "..."
}

tags: 5-8 comma-separated lowercase tags relevant to the topic (no # prefix)
faqs: 4-5 frequently asked questions with detailed answers as a JSON array string
articleSection: single broad category name this article belongs to (e.g. "Technology", "Marketing", "Finance", "Healthcare")`;

  const response = await generateWithThinking(prompt, {
    model: GEMINI_MODELS.PRO_PREVIEW,
    maxRetries: 3,
  });

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse blog content from AI');

  return JSON.parse(jsonMatch[0]);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { brandId, topic, count = 1, tone, targetAudience, keywords, dbConnectionId, calendarTitle } = body;

    if (!brandId || !topic) {
      return NextResponse.json({ error: 'brandId and topic are required' }, { status: 400 });
    }

    const userBrand = await prisma.userBrand.findFirst({
      where: { userId: token.id, brandId },
      include: { brand: { select: { name: true, description: true } } },
    });

    if (!userBrand) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const totalCount = Math.min(Math.max(Number(count), 1), 10);

    // Create calendar if generating multiple
    let calendar = null;
    if (totalCount > 1) {
      calendar = await prisma.blogAutomationCalendar.create({
        data: {
          brandId,
          title: calendarTitle || `${topic} — ${totalCount} posts`,
          topic,
          count: totalCount,
          status: 'GENERATING',
        },
      });
    }

    const generated = [];

    for (let i = 0; i < totalCount; i++) {
      const angles = [
        'beginner\'s ultimate guide with step-by-step examples',
        'advanced strategies used by top Fortune 500 companies',
        'common mistakes businesses make and how to avoid them',
        'future trends and predictions backed by industry data',
        'ROI and business case — why this matters for your bottom line',
        'tools, frameworks, and best practices compared',
        'real-world case studies and success stories',
        'actionable checklist and implementation roadmap',
        'myths vs. facts — debunking misconceptions',
        'expert interviews and insider insights',
      ];
      const topicVariation = totalCount > 1
        ? `${topic} — Angle: "${angles[i % angles.length]}" (completely unique perspective, no overlap with other posts in this series)`
        : topic;

      const blogData = await generateBlogContent(
        topicVariation,
        userBrand.brand.name,
        userBrand.brand.description,
        { tone, targetAudience, keywords }
      );

      const automation = await prisma.blogAutomation.create({
        data: {
          brandId,
          calendarId: calendar?.id || null,
          dbConnectionId: dbConnectionId || null,
          title: blogData.title,
          slug: blogData.slug + '-' + Date.now(),
          content: blogData.content,
          excerpt: blogData.excerpt,
          tags: blogData.tags ? blogData.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
          faqs: blogData.faqs || null,
          articleSection: blogData.articleSection || null,
          seoTitle: blogData.seoTitle,
          seoDescription: blogData.seoDescription,
          seoKeywords: blogData.seoKeywords,
          bannerPrompt: blogData.imagePrompt,
          status: 'DRAFT',
        },
      });

      generated.push(automation);
    }

    if (calendar) {
      await prisma.blogAutomationCalendar.update({
        where: { id: calendar.id },
        data: { status: 'DONE' },
      });
    }

    return NextResponse.json({
      success: true,
      calendar,
      automations: generated,
      message: `Generated ${generated.length} blog post(s) successfully`,
    }, { status: 201 });

  } catch (error) {
    console.error('[BLOG-GEN] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
