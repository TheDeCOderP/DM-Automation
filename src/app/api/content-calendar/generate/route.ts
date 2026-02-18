import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking, GEMINI_MODELS } from "@/lib/gemini";
import { Platform } from "@prisma/client";

// Extend timeout to maximum for Vercel Hobby tier
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface GenerateCalendarRequest {
  brandId: string;
  topic: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
  postsPerWeek: number;
}

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
  }
]

Generate exactly ${totalPosts} content ideas now:`;

  try {
    const response = await generateWithThinking(prompt, {
      model: GEMINI_MODELS.PRO_PREVIEW
    });
    
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

function calculateSuggestedTime(day: number, platform: Platform): Date {
  const bestTimes: Record<string, { hour: number; minute: number }> = {
    LINKEDIN: { hour: 10, minute: 0 },
    TWITTER: { hour: 12, minute: 0 },
    INSTAGRAM: { hour: 11, minute: 0 },
    FACEBOOK: { hour: 13, minute: 0 },
    YOUTUBE: { hour: 14, minute: 0 },
    PINTEREST: { hour: 20, minute: 0 },
    REDDIT: { hour: 9, minute: 0 },
    TIKTOK: { hour: 19, minute: 0 }
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

    // Step 3: Save calendar items WITHOUT captions (will be generated separately)
    console.log("[CALENDAR] Step 3: Saving calendar structure...");
    await prisma.contentCalendarItem.createMany({
      data: contentIdeas.map((idea) => ({
        calendarId: calendar.id,
        day: idea.day,
        topic: idea.topic,
        hashtags: [],
        imagePrompt: idea.imagePrompt,
        suggestedTime: calculateSuggestedTime(idea.day, platforms[0]),
        status: "DRAFT",
      })),
    });

    console.log(`[CALENDAR] ✓ Successfully created calendar structure with ${contentIdeas.length} items`);

    // Return the calendar with items (captions will be generated by frontend)
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
        message: "Content calendar structure created. Generating captions...",
        calendar: completeCalendar,
        needsCaptions: true, // Signal to frontend to call caption generation
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
