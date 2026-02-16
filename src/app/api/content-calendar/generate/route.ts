import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking } from "@/lib/gemini";
import { Platform } from "@prisma/client";

interface GenerateCalendarRequest {
  brandId: string;
  topic: string;
  duration: number; // days (7-30)
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  platforms: Platform[];
  postsPerWeek: number;
}

interface CalendarItemData {
  day: number;
  topic: string;
  captionLinkedIn?: string;
  captionTwitter?: string;
  captionInstagram?: string;
  captionFacebook?: string;
  captionYouTube?: string;
  captionPinterest?: string;
  captionReddit?: string;
  captionTikTok?: string;
  hashtags: string[];
  imagePrompt: string;
  suggestedTime: Date;
}

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

async function generateContentIdeas(
  topic: string,
  duration: number,
  postsPerWeek: number,
  brandName: string
): Promise<Array<{ day: number; topic: string; imagePrompt: string }>> {
  const totalPosts = Math.ceil((duration / 7) * postsPerWeek);
  
  const prompt = `You are a content strategist for ${brandName}. Generate ${totalPosts} content ideas for a ${duration}-day content calendar.

Main Topic: ${topic}

Requirements:
- Create ${totalPosts} unique, engaging content ideas
- Each idea should be specific and actionable
- Vary content types: tips, how-tos, case studies, statistics, quotes, behind-the-scenes
- Make ideas relevant to the topic but diverse in approach
- Include seasonal/trending angles where appropriate

For each content idea, provide:
1. A specific, engaging topic (5-10 words)
2. A detailed image prompt for AI image generation (describe the visual)

Format your response as a JSON array:
[
  {
    "day": 1,
    "topic": "5 Common Mistakes in [Topic]",
    "imagePrompt": "Modern office desk with laptop showing analytics dashboard, professional lighting, clean aesthetic"
  },
  {
    "day": 2,
    "topic": "How to Get Started with [Topic]",
    "imagePrompt": "Person working on laptop with coffee, bright natural lighting, motivational workspace"
  }
]

Generate exactly ${totalPosts} content ideas now:`;

  try {
    const response = await generateWithThinking(prompt, {
      thinkingLevel: 'medium'
    });
    
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse content ideas from AI response");
    }
    
    const ideas = JSON.parse(jsonMatch[0]);
    return ideas;
  } catch (error) {
    console.error("Error generating content ideas:", error);
    throw new Error("Failed to generate content ideas");
  }
}

async function generatePlatformCaption(
  topic: string,
  contentIdea: string,
  platform: Platform,
  brandName: string,
  day: number
): Promise<{ caption: string; hashtags: string[] }> {
  // Skip 'ALL' platform as it's not a real platform
  if (platform === 'ALL') {
    return { caption: contentIdea, hashtags: [] };
  }
  
  const guidelines = PLATFORM_GUIDELINES[platform as keyof typeof PLATFORM_GUIDELINES];
  
  if (!guidelines) {
    return { caption: contentIdea, hashtags: [] };
  }
  
  const prompt = `You are a social media copywriter for ${brandName}. Create a ${platform} post.

Content Topic: ${contentIdea}
Main Theme: ${topic}
Post Day: ${day}

Platform Guidelines for ${platform}:
- Tone: ${guidelines.tone}
- Length: ${guidelines.length}
- Style: ${guidelines.style}
- Hashtags: ${guidelines.hashtags}
- CTA: ${guidelines.cta}

Requirements:
1. Write an engaging caption that follows the platform's best practices
2. Include appropriate emojis (but don't overuse)
3. Add a clear call-to-action
4. Make it authentic and valuable
5. DO NOT use markdown formatting
6. For Twitter: Keep under 280 characters
7. For Instagram: Use line breaks for readability

Generate:
1. The caption text
2. A list of relevant hashtags (without # symbol)

Format as JSON:
{
  "caption": "Your engaging caption here...",
  "hashtags": ["Marketing", "DigitalMarketing", "Tips"]
}`;

  try {
    const response = await generateWithThinking(prompt, {
      thinkingLevel: 'low'
    });
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse caption from AI response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return result;
  } catch (error) {
    console.error(`Error generating ${platform} caption:`, error);
    // Fallback
    return {
      caption: `${contentIdea}\n\n#${topic.replace(/\s+/g, '')}`,
      hashtags: [topic.replace(/\s+/g, '')]
    };
  }
}

function calculateSuggestedTime(day: number, platform: Platform): Date {
  // Best posting times per platform (based on research)
  const bestTimes: Record<string, { hour: number; minute: number }> = {
    LINKEDIN: { hour: 10, minute: 0 }, // 10 AM - Business hours
    TWITTER: { hour: 12, minute: 0 },  // 12 PM - Lunch break
    INSTAGRAM: { hour: 11, minute: 0 }, // 11 AM - Mid-morning
    FACEBOOK: { hour: 13, minute: 0 },  // 1 PM - Early afternoon
    YOUTUBE: { hour: 14, minute: 0 },   // 2 PM - Afternoon
    PINTEREST: { hour: 20, minute: 0 }, // 8 PM - Evening
    REDDIT: { hour: 9, minute: 0 },     // 9 AM - Morning
    TIKTOK: { hour: 19, minute: 0 }     // 7 PM - Evening
  };
  
  const time = bestTimes[platform] || { hour: 10, minute: 0 };
  
  const date = new Date();
  date.setDate(date.getDate() + day);
  date.setHours(time.hour, time.minute, 0, 0);
  
  return date;
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: GenerateCalendarRequest = await req.json();
    const { brandId, topic, duration, startDate, endDate, platforms, postsPerWeek } = body;

    // Validate input
    if (!brandId || !topic || !duration || !platforms || !postsPerWeek) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (duration < 7 || duration > 90) {
      return NextResponse.json(
        { error: "Duration must be between 7 and 90 days" },
        { status: 400 }
      );
    }

    if (postsPerWeek < 1 || postsPerWeek > 14) {
      return NextResponse.json(
        { error: "Posts per week must be between 1 and 14" },
        { status: 400 }
      );
    }

    // Check brand access
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: brandId,
      },
      include: {
        brand: true,
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    console.log(`[CALENDAR] Generating ${duration}-day calendar for ${userBrand.brand.name}`);

    // Step 1: Generate content ideas
    console.log("[CALENDAR] Step 1: Generating content ideas...");
    const contentIdeas = await generateContentIdeas(
      topic,
      duration,
      postsPerWeek,
      userBrand.brand.name
    );

    // Step 2: Create calendar in database
    console.log("[CALENDAR] Step 2: Creating calendar...");
    const calendar = await prisma.contentCalendar.create({
      data: {
        brandId,
        topic,
        duration,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        platforms: platforms,
        postsPerWeek,
        status: "DRAFT",
      },
    });

    // Step 3: Generate platform-specific captions for each idea (in batches)
    console.log("[CALENDAR] Step 3: Generating platform-specific captions in batches...");
    const calendarItems: CalendarItemData[] = [];
    const BATCH_SIZE = 5; // Process 5 items at a time to avoid timeout

    for (let i = 0; i < contentIdeas.length; i += BATCH_SIZE) {
      const batch = contentIdeas.slice(i, i + BATCH_SIZE);
      console.log(`[CALENDAR] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(contentIdeas.length / BATCH_SIZE)}`);

      // Process batch in parallel
      const batchPromises = batch.map(async (idea) => {
        const item: CalendarItemData = {
          day: idea.day,
          topic: idea.topic,
          hashtags: [],
          imagePrompt: idea.imagePrompt,
          suggestedTime: calculateSuggestedTime(idea.day, platforms[0]),
        };

        // Generate captions for all platforms in parallel
        const captionPromises = platforms.map(async (platform) => {
          console.log(`[CALENDAR] Generating ${platform} caption for day ${idea.day}...`);
          
          const { caption, hashtags } = await generatePlatformCaption(
            topic,
            idea.topic,
            platform,
            userBrand.brand.name,
            idea.day
          );

          return { platform, caption, hashtags };
        });

        const results = await Promise.all(captionPromises);

        // Store captions in appropriate fields
        for (const result of results) {
          if (result.platform === "LINKEDIN") item.captionLinkedIn = result.caption;
          else if (result.platform === "TWITTER") item.captionTwitter = result.caption;
          else if (result.platform === "INSTAGRAM") item.captionInstagram = result.caption;
          else if (result.platform === "FACEBOOK") item.captionFacebook = result.caption;
          else if (result.platform === "YOUTUBE") item.captionYouTube = result.caption;
          else if (result.platform === "PINTEREST") item.captionPinterest = result.caption;
          else if (result.platform === "REDDIT") item.captionReddit = result.caption;
          else if (result.platform === "TIKTOK") item.captionTikTok = result.caption;

          // Merge hashtags (avoid duplicates)
          item.hashtags = Array.from(new Set([...item.hashtags, ...result.hashtags]));
        }

        return item;
      });

      const batchResults = await Promise.all(batchPromises);
      calendarItems.push(...batchResults);
    }

    // Step 4: Save calendar items to database
    console.log("[CALENDAR] Step 4: Saving calendar items...");
    await prisma.contentCalendarItem.createMany({
      data: calendarItems.map((item) => ({
        calendarId: calendar.id,
        day: item.day,
        topic: item.topic,
        captionLinkedIn: item.captionLinkedIn,
        captionTwitter: item.captionTwitter,
        captionInstagram: item.captionInstagram,
        captionFacebook: item.captionFacebook,
        captionYouTube: item.captionYouTube,
        captionPinterest: item.captionPinterest,
        captionReddit: item.captionReddit,
        captionTikTok: item.captionTikTok,
        hashtags: item.hashtags,
        imagePrompt: item.imagePrompt,
        suggestedTime: item.suggestedTime,
        status: "DRAFT",
      })),
    });

    console.log(`[CALENDAR] ✓ Successfully generated calendar with ${calendarItems.length} items`);

    // Return the complete calendar
    const completeCalendar = await prisma.contentCalendar.findUnique({
      where: { id: calendar.id },
      include: {
        items: {
          orderBy: { day: "asc" },
        },
        brand: {
          select: {
            name: true,
            logo: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Content calendar generated successfully",
        calendar: completeCalendar,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[CALENDAR] Error generating calendar:", error);
    return NextResponse.json(
      {
        error: "Failed to generate content calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
