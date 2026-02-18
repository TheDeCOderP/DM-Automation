import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking } from "@/lib/gemini";
import { Platform } from "@prisma/client";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Platform-specific caption guidelines with advanced strategies
const PLATFORM_GUIDELINES = {
  LINKEDIN: {
    audience: "Professionals, founders, decision-makers",
    tone: "Professional, insightful, authority-building",
    hook: "Strong first 2 lines to avoid 'see more' cutoff",
    length: "150-300 words",
    structure: "Hook → Story/Insight → Bullet Value → CTA",
    formatting: "Short paragraphs, spaced lines, occasional bullets",
    emojiUsage: "Minimal (0-3 max)",
    contentTypes: ["Thought leadership", "Case study", "Lessons learned", "Industry trends"],
    engagementTriggers: ["Ask for opinions", "Invite experiences", "Poll-style question"],
    hashtags: "3-5 niche professional hashtags (avoid generic)",
    algorithmTip: "Encourage meaningful comments over reactions",
    cta: ["What's your take?", "Comment your experience", "Agree or disagree?"],
  },
  TWITTER: {
    audience: "Fast-scrolling, trend-aware users",
    tone: "Sharp, concise, conversational",
    hook: "First 5-7 words must create curiosity",
    length: "100-280 characters",
    structure: "Hook → Insight → Punchline or CTA",
    formatting: "Short lines, threads for depth",
    emojiUsage: "1-2 max",
    contentTypes: ["Hot takes", "Micro-lessons", "Stats", "Threads"],
    engagementTriggers: ["Retweet bait", "Question", "Controversial statement"],
    hashtags: "1-2 relevant or trending hashtags",
    algorithmTip: "Replies boost reach more than likes",
    cta: ["Reply your thoughts", "RT if useful", "Thread below 👇"],
  },
  INSTAGRAM: {
    audience: "Visual-first, emotional buyers",
    tone: "Relatable, storytelling, inspiring",
    hook: "Powerful first line before 'more' break",
    length: "125-150 words",
    structure: "Hook → Story → Lesson → CTA",
    formatting: "Line breaks every 1-2 sentences",
    emojiUsage: "Moderate (3-8 relevant)",
    contentTypes: ["Behind-the-scenes", "Journey", "Tips carousel", "Motivation"],
    engagementTriggers: ["Save-worthy tips", "Tag someone", "Relatable moment"],
    hashtags: "10-15 niche + mid-size hashtags",
    algorithmTip: "Saves & shares > likes",
    cta: ["Save this", "Tag a friend", "DM me"],
  },
  FACEBOOK: {
    audience: "Community-driven mixed demographics",
    tone: "Conversational, friendly",
    hook: "Relatable opening question or statement",
    length: "100-250 words",
    structure: "Story → Question → CTA",
    formatting: "Natural paragraphs",
    emojiUsage: "Light-moderate",
    contentTypes: ["Community stories", "Polls", "Local updates"],
    engagementTriggers: ["Ask direct question", "Encourage sharing"],
    hashtags: "Optional 2-3",
    algorithmTip: "Native engagement > outbound links",
    cta: ["Comment below", "Share with friends"],
  },
  YOUTUBE: {
    audience: "Search-driven + subscribers",
    tone: "SEO-focused, descriptive",
    hook: "First 2 lines must contain keywords",
    length: "200-300 words",
    structure: "Keyword intro → Value summary → Timestamps → Links",
    formatting: "Bullet timestamps, clear spacing",
    emojiUsage: "Minimal",
    contentTypes: ["Tutorial", "Explainer", "Case study"],
    engagementTriggers: ["Ask viewers to comment", "Pin a question"],
    hashtags: "3-5 keyword-based hashtags",
    algorithmTip: "Watch time & retention matter most",
    cta: ["Subscribe", "Like the video", "Comment below"],
  },
  PINTEREST: {
    audience: "Idea seekers, planners",
    tone: "Inspirational, practical",
    hook: "Benefit-driven headline",
    length: "100-200 words",
    structure: "Problem → Solution → Steps",
    formatting: "Clean, organized with clear sections",
    emojiUsage: "Minimal",
    contentTypes: ["How-to", "Checklist", "Ideas list"],
    engagementTriggers: ["Save-worthy content", "Actionable tips"],
    hashtags: "5-10 niche keywords",
    algorithmTip: "Keyword optimization > hashtags",
    cta: ["Save this pin", "Visit website"],
  },
  REDDIT: {
    audience: "Community-driven, skeptical",
    tone: "Authentic, transparent",
    hook: "Context-first, no clickbait",
    length: "150-500 words",
    structure: "Context → Value → Experience → Question",
    formatting: "Clean, readable, no marketing tone",
    emojiUsage: "None or very minimal",
    contentTypes: ["Case study", "Experience sharing", "Advice"],
    engagementTriggers: ["Genuine questions", "Value-first approach"],
    hashtags: "None (use subreddit flair)",
    algorithmTip: "Avoid direct selling; give pure value",
    cta: ["Would love feedback", "Curious about your thoughts"],
  },
  TIKTOK: {
    audience: "Short attention, trend-driven",
    tone: "Energetic, raw, authentic",
    hook: "Pattern interrupt in first 2-3 seconds",
    length: "100-150 characters",
    structure: "Hook → Quick value → CTA",
    formatting: "Short, punchy text overlays",
    emojiUsage: "Trendy, light",
    contentTypes: ["Quick tips", "Myth busting", "POV", "Trends"],
    engagementTriggers: ["Duet prompt", "Controversial hook"],
    hashtags: "3-5 trending + niche mix",
    algorithmTip: "Retention > everything",
    cta: ["Follow for more", "Duet this", "Comment 'YES'"],
  }
};

async function generateAllPlatformCaptions(
  topic: string,
  contentIdea: string,
  platforms: Platform[],
  brandName: string,
  brandDescription: string | null | undefined,
  brandWebsite: string | null | undefined,
  day: number
): Promise<Record<Platform, { caption: string; hashtags: string[] }>> {
  const validPlatforms = platforms.filter(p => p !== 'ALL');
  
  if (validPlatforms.length === 0) {
    return {} as Record<Platform, { caption: string; hashtags: string[] }>;
  }
  
  const platformsInfo = validPlatforms.map(platform => {
    const g = PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES];
    return `${platform}:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Audience: ${g.audience}
Tone: ${g.tone}
Hook Strategy: ${g.hook}
Length: ${g.length}
Structure: ${g.structure}
Formatting: ${g.formatting}
Emoji Usage: ${g.emojiUsage}
Content Types: ${g.contentTypes.join(', ')}
Engagement Triggers: ${g.engagementTriggers.join(', ')}
Hashtags: ${g.hashtags}
Algorithm Tip: ${g.algorithmTip}
CTA Examples: ${g.cta.join(' | ')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }).join('\n\n');
  
  // Build brand context
  let brandContext = `Brand: ${brandName}`;
  if (brandDescription) {
    brandContext += `\nBrand Description: ${brandDescription}`;
  }
  if (brandWebsite) {
    brandContext += `\nBrand Website: ${brandWebsite}`;
  }
  
  const prompt = `You are an expert social media copywriter for ${brandName}. Create high-performing posts for multiple platforms.

${brandContext}

Content Topic: ${contentIdea}
Main Theme: ${topic}
Post Day: ${day}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PLATFORM-SPECIFIC GUIDELINES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${platformsInfo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HOOK: Follow each platform's hook strategy precisely
2. STRUCTURE: Use the exact structure specified for each platform
3. FORMATTING: Apply platform-specific formatting rules
4. TONE: Match the brand's identity while adapting to platform tone
5. LENGTH: Stay within specified character/word limits
6. ENGAGEMENT: Include platform-specific engagement triggers
7. ALGORITHM: Optimize for each platform's algorithm priorities
8. CTA: Use strong, platform-appropriate calls-to-action
9. AUTHENTICITY: Make it sound human, not AI-generated
10. VALUE: Provide genuine value, not just promotional content
${brandWebsite ? `11. BRAND CONTEXT: Reference brand website/offerings when relevant` : ''}
${brandDescription ? `12. BRAND VOICE: Reflect the brand's mission and values` : ''}

⚠️ DO NOT:
- Use markdown formatting (**, __, etc.)
- Exceed character limits
- Use generic or overused phrases
- Sound overly promotional
- Ignore platform-specific best practices

Generate captions for ALL platforms listed above.

Format as JSON:
{
  "LINKEDIN": { "caption": "...", "hashtags": ["Marketing", "Tips"] },
  "TWITTER": { "caption": "...", "hashtags": ["Marketing"] }
}`;

  try {
    const response = await generateWithThinking(prompt, {
      thinkingLevel: 'low',
      maxRetries: 3
    });
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse captions from AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error: any) {
    console.error(`[CAPTIONS] ⚠️  Error generating captions:`, error?.message || error);
    
    // Return fallback captions instead of failing completely
    const fallback: any = {};
    validPlatforms.forEach(platform => {
      fallback[platform] = {
        caption: `${contentIdea}\n\n#${topic.replace(/\s+/g, '')}`,
        hashtags: [topic.replace(/\s+/g, '')]
      };
    });
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { calendarId, itemIds } = await req.json();

    if (!calendarId || !itemIds || !Array.isArray(itemIds)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get calendar with brand info including description and website
    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
      include: {
        brand: {
          select: {
            name: true,
            description: true,
            website: true,
          }
        },
        items: {
          where: {
            id: { in: itemIds }
          }
        }
      }
    });

    if (!calendar) {
      return NextResponse.json({ error: "Calendar not found" }, { status: 404 });
    }

    // Check access
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: calendar.brandId,
      },
    });

    if (!userBrand) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CAPTIONS] 📝 Starting Caption Generation`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Brand: ${calendar.brand.name}`);
    if (calendar.brand.description) {
      console.log(`� Description: ${calendar.brand.description.substring(0, 80)}${calendar.brand.description.length > 80 ? '...' : ''}`);
    }
    console.log(`�📊 Items to process: ${itemIds.length}`);
    const platformsList = Array.isArray(calendar.platforms) ? calendar.platforms.join(', ') : String(calendar.platforms);
    console.log(`🎯 Platforms: ${platformsList}`);
    console.log(`${'='.repeat(60)}\n`);

    // Generate captions for each item SEQUENTIALLY to avoid network congestion
    const startTime = Date.now();
    const updates = [];
    
    for (let index = 0; index < calendar.items.length; index++) {
      const item = calendar.items[index];
      console.log(`[CAPTIONS] 📝 [${index + 1}/${calendar.items.length}] Generating for Day ${item.day}: "${item.topic}"`);
      
      const allCaptions = await generateAllPlatformCaptions(
        calendar.topic,
        item.topic,
        calendar.platforms as Platform[],
        calendar.brand.name,
        calendar.brand.description,
        calendar.brand.website,
        item.day
      );

      const updateData: any = {
        hashtags: []
      };

      for (const [platform, data] of Object.entries(allCaptions)) {
        if (platform === "LINKEDIN") updateData.captionLinkedIn = data.caption;
        else if (platform === "TWITTER") updateData.captionTwitter = data.caption;
        else if (platform === "INSTAGRAM") updateData.captionInstagram = data.caption;
        else if (platform === "FACEBOOK") updateData.captionFacebook = data.caption;
        else if (platform === "YOUTUBE") updateData.captionYouTube = data.caption;
        else if (platform === "PINTEREST") updateData.captionPinterest = data.caption;
        else if (platform === "REDDIT") updateData.captionReddit = data.caption;
        else if (platform === "TIKTOK") updateData.captionTikTok = data.caption;

        updateData.hashtags = Array.from(new Set([...updateData.hashtags, ...data.hashtags]));
      }

      const result = await prisma.contentCalendarItem.update({
        where: { id: item.id },
        data: updateData
      });
      
      updates.push(result);
      console.log(`[CAPTIONS] ✅ [${index + 1}/${calendar.items.length}] Completed Day ${item.day}`);
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgTime = (parseFloat(totalTime) / updates.length).toFixed(1);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CAPTIONS] 🎉 Caption Generation Complete!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Generated captions for ${updates.length} items`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`📊 Average per item: ${avgTime}s`);
    console.log(`${'='.repeat(60)}\n`);

    return NextResponse.json({
      success: true,
      updatedItems: updates
    });
  } catch (error: any) {
    console.error(`\n${'='.repeat(60)}`);
    console.error("[CAPTIONS] ❌ Error generating captions");
    console.error(`${'='.repeat(60)}`);
    console.error(error);
    console.error(`${'='.repeat(60)}\n`);
    
    // Extract user-friendly error message
    let errorMessage = "Failed to generate captions";
    let statusCode = 500;
    
    if (error?.message?.includes("high demand") || error?.status === 503 || error?.code === 503) {
      errorMessage = "The AI service is experiencing high demand. Please try again in a few moments.";
      statusCode = 503;
    } else if (error?.message?.includes("rate limit") || error?.status === 429 || error?.code === 429) {
      errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
      statusCode = 429;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: statusCode }
    );
  }
}
