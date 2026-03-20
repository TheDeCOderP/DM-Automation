import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking } from "@/lib/gemini";
import { Platform } from "@prisma/client";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PLATFORM_GUIDELINES = {
  LINKEDIN: { audience: "Professionals, founders, decision-makers", tone: "Professional, insightful", hook: "Strong first 2 lines", length: "150-300 words", structure: "Hook → Story/Insight → Bullets → CTA", hashtags: "3-5 niche professional hashtags" },
  TWITTER: { audience: "Fast-scrolling, trend-aware users", tone: "Sharp, concise, conversational", hook: "First 5-7 words create curiosity", length: "100-280 characters", structure: "Hook → Insight → CTA", hashtags: "1-2 relevant hashtags" },
  INSTAGRAM: { audience: "Visual-first, emotional buyers", tone: "Relatable, storytelling, inspiring", hook: "Powerful first line before 'more' break", length: "125-150 words", structure: "Hook → Story → Lesson → CTA", hashtags: "10-15 niche hashtags" },
  FACEBOOK: { audience: "Community-driven mixed demographics", tone: "Conversational, friendly", hook: "Relatable opening question", length: "100-250 words", structure: "Story → Question → CTA", hashtags: "2-3 optional hashtags" },
  YOUTUBE: { audience: "Search-driven + subscribers", tone: "SEO-focused, descriptive", hook: "First 2 lines must contain keywords", length: "200-300 words", structure: "Keyword intro → Value → Timestamps → Links", hashtags: "3-5 keyword hashtags" },
  PINTEREST: { audience: "Idea seekers, planners", tone: "Inspirational, practical", hook: "Benefit-driven headline", length: "100-200 words", structure: "Problem → Solution → Steps", hashtags: "5-10 niche keywords" },
  REDDIT: { audience: "Community-driven, skeptical", tone: "Authentic, transparent", hook: "Context-first, no clickbait", length: "150-500 words", structure: "Context → Value → Experience → Question", hashtags: "None (use subreddit flair)" },
  TIKTOK: { audience: "Short attention, trend-driven", tone: "Energetic, raw, authentic", hook: "Pattern interrupt in first 2-3 seconds", length: "100-150 characters", structure: "Hook → Quick value → CTA", hashtags: "3-5 trending + niche mix" },
};

const CTA_GUIDE: Record<string, string> = {
  engagement: "Drive comments, shares, and reactions",
  traffic: "Direct users to visit a website or read more",
  leads: "Encourage DMs, sign-ups, or downloads",
  sales: "Promote a product/offer with urgency",
  community: "Invite tagging, joining groups, or community participation",
  awareness: "Grow followers, saves, and subscriptions",
};

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { itemId, platforms, tone, ctaStyle, hashtagCount, customInstructions, keepExisting, existingCaptions } = await req.json();

    if (!itemId || !platforms?.length) {
      return NextResponse.json({ error: "itemId and platforms are required" }, { status: 400 });
    }

    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: itemId },
      include: { calendar: { include: { brand: true } } },
    });

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const userBrand = await prisma.userBrand.findFirst({
      where: { userId: token.id, brandId: item.calendar.brandId },
    });
    if (!userBrand) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const brand = item.calendar.brand;
    const toneLabel = tone || "professional";
    const ctaGoal = ctaStyle || "engagement";
    const hashtagTarget = hashtagCount ?? 5;
    const ctaDescription = CTA_GUIDE[ctaGoal] || ctaGoal;
    const custom = customInstructions ? `\n\nADDITIONAL INSTRUCTIONS (must follow):\n${customInstructions}` : "";

    const platformsInfo = (platforms as string[])
      .filter((p) => p in PLATFORM_GUIDELINES)
      .map((p) => {
        const g = PLATFORM_GUIDELINES[p as keyof typeof PLATFORM_GUIDELINES];
        return `${p}: audience=${g.audience} | tone=${g.tone} | hook=${g.hook} | length=${g.length} | structure=${g.structure}`;
      })
      .join("\n");

    let brandContext = `Brand: ${brand.name}`;
    if (brand.description) brandContext += `\nDescription: ${brand.description}`;
    if (brand.website) brandContext += `\nWebsite: ${brand.website}`;

    let prompt: string;

    if (keepExisting && existingCaptions) {
      // Build existing captions block for each platform
      const existingBlock = (platforms as string[])
        .filter((p) => existingCaptions[p]?.trim())
        .map((p) => `${p}:\n"""\n${existingCaptions[p]}\n"""`)
        .join("\n\n");

      prompt = `You are an expert social media copywriter for ${brand.name}.

${brandContext}

Content Topic: ${item.topic}
Main Theme: ${item.calendar.topic}

TASK: Enhance the existing captions below. DO NOT rewrite them from scratch.
- Keep the original message, hook, and structure intact
- Append or weave in a CTA aligned to: "${ctaDescription}"
${customInstructions ? `- Apply these additional instructions: ${customInstructions}` : ""}
- Ensure exactly ${hashtagTarget} hashtags per platform
- No markdown formatting (**, __, etc.)

EXISTING CAPTIONS TO ENHANCE:
${existingBlock}

Respond as JSON only:
{
  "PLATFORM": { "caption": "...", "hashtags": ["tag1", "tag2"] }
}`;
    } else {
      prompt = `You are an expert social media copywriter for ${brand.name}.

${brandContext}

Content Topic: ${item.topic}
Main Theme: ${item.calendar.topic}
Tone/Voice: ${toneLabel}
CTA Goal: ${ctaDescription}
Hashtags: Generate exactly ${hashtagTarget} per platform${custom}

PLATFORM GUIDELINES:
${platformsInfo}

REQUIREMENTS:
1. Apply "${toneLabel}" tone consistently
2. End every post with a CTA aligned to: "${ctaDescription}"
3. Include exactly ${hashtagTarget} hashtags per platform
4. Follow each platform's hook, structure, and length
5. Sound human, not AI-generated
6. No markdown formatting (**, __, etc.)

Generate captions for: ${platforms.join(", ")}

Respond as JSON only:
{
  "PLATFORM": { "caption": "...", "hashtags": ["tag1", "tag2"] }
}`;
    }

    const response = await generateWithThinking(prompt, { thinkingLevel: "low", maxRetries: 2 });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const captions = JSON.parse(jsonMatch[0]);

    // Persist the regenerated captions to DB
    const updateData: any = {};
    for (const [platform, data] of Object.entries(captions) as [string, any][]) {
      if (platform === "LINKEDIN") updateData.captionLinkedIn = data.caption;
      else if (platform === "TWITTER") updateData.captionTwitter = data.caption;
      else if (platform === "INSTAGRAM") updateData.captionInstagram = data.caption;
      else if (platform === "FACEBOOK") updateData.captionFacebook = data.caption;
      else if (platform === "YOUTUBE") updateData.captionYouTube = data.caption;
      else if (platform === "PINTEREST") updateData.captionPinterest = data.caption;
      else if (platform === "REDDIT") updateData.captionReddit = data.caption;
      else if (platform === "TIKTOK") updateData.captionTikTok = data.caption;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.contentCalendarItem.update({ where: { id: itemId }, data: updateData });
    }

    return NextResponse.json({ success: true, captions });
  } catch (error) {
    console.error("[REGENERATE-CAPTION] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate" },
      { status: 500 }
    );
  }
}
