import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking } from "@/lib/gemini";
import { Platform } from "@prisma/client";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Platform-specific caption guidelines
const PLATFORM_GUIDELINES = {
  LINKEDIN: {
    tone: "Professional, thought leadership",
    length: "150-300 words",
    style: "Educational, industry insights, personal stories",
    hashtags: "3-5 relevant professional hashtags",
    cta: "Ask questions, encourage discussion"
  },
  TWITTER: {
    tone: "Concise, engaging, conversational",
    length: "100-280 characters",
    style: "Quick tips, stats, quotes, threads for longer content",
    hashtags: "1-2 trending hashtags",
    cta: "Retweet, reply, or share thoughts"
  },
  INSTAGRAM: {
    tone: "Visual, engaging, storytelling",
    length: "125-150 words",
    style: "Emotional connection, behind-the-scenes, lifestyle",
    hashtags: "10-15 relevant hashtags",
    cta: "Save, share, tag a friend"
  },
  FACEBOOK: {
    tone: "Conversational, community-focused",
    length: "100-250 words",
    style: "Stories, questions, polls, community building",
    hashtags: "2-3 hashtags (optional)",
    cta: "Comment, share, react"
  },
  YOUTUBE: {
    tone: "Descriptive, SEO-optimized",
    length: "200-300 words",
    style: "Video description with timestamps, links, resources",
    hashtags: "3-5 video-relevant hashtags",
    cta: "Subscribe, like, comment"
  },
  PINTEREST: {
    tone: "Inspirational, actionable",
    length: "100-200 words",
    style: "How-to, tips, ideas, visual descriptions",
    hashtags: "5-10 niche hashtags",
    cta: "Save pin, visit website"
  },
  REDDIT: {
    tone: "Authentic, helpful, community-first",
    length: "150-500 words",
    style: "Detailed, value-driven, no self-promotion",
    hashtags: "None (use subreddit flair)",
    cta: "Discuss, share experience"
  },
  TIKTOK: {
    tone: "Fun, trendy, authentic",
    length: "100-150 characters",
    style: "Hook in first 3 seconds, trending sounds",
    hashtags: "3-5 trending + niche hashtags",
    cta: "Follow, duet, stitch"
  }
};

async function generateAllPlatformCaptions(
  topic: string,
  contentIdea: string,
  platforms: Platform[],
  brandName: string,
  day: number
): Promise<Record<Platform, { caption: string; hashtags: string[] }>> {
  const validPlatforms = platforms.filter(p => p !== 'ALL');
  
  if (validPlatforms.length === 0) {
    return {} as Record<Platform, { caption: string; hashtags: string[] }>;
  }
  
  const platformsInfo = validPlatforms.map(platform => {
    const guidelines = PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES];
    return `${platform}:
- Tone: ${guidelines.tone}
- Length: ${guidelines.length}
- Style: ${guidelines.style}
- Hashtags: ${guidelines.hashtags}
- CTA: ${guidelines.cta}`;
  }).join('\n\n');
  
  const prompt = `You are a social media copywriter for ${brandName}. Create posts for multiple platforms.

Content Topic: ${contentIdea}
Main Theme: ${topic}
Post Day: ${day}

Platform Guidelines:
${platformsInfo}

Requirements:
1. Write engaging captions that follow each platform's best practices
2. Include appropriate emojis (but don't overuse)
3. Add clear calls-to-action
4. Make it authentic and valuable
5. DO NOT use markdown formatting
6. For Twitter: Keep under 280 characters
7. For Instagram: Use line breaks for readability

Generate captions for ALL platforms listed above.

Format as JSON:
{
  "LINKEDIN": { "caption": "...", "hashtags": ["Marketing", "Tips"] },
  "TWITTER": { "caption": "...", "hashtags": ["Marketing"] }
}`;

  try {
    const response = await generateWithThinking(prompt, {
      thinkingLevel: 'low'
    });
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse captions from AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    console.error(`Error generating captions:`, error);
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

    // Get calendar with brand info
    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
      include: {
        brand: true,
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

    console.log(`[CAPTIONS] Generating captions for ${itemIds.length} items`);

    // Generate captions for each item
    const updates = await Promise.all(
      calendar.items.map(async (item) => {
        const allCaptions = await generateAllPlatformCaptions(
          calendar.topic,
          item.topic,
          calendar.platforms as Platform[],
          calendar.brand.name,
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

        return prisma.contentCalendarItem.update({
          where: { id: item.id },
          data: updateData
        });
      })
    );

    console.log(`[CAPTIONS] ✓ Generated captions for ${updates.length} items`);

    return NextResponse.json({
      success: true,
      updatedItems: updates
    });
  } catch (error) {
    console.error("[CAPTIONS] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate captions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
