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
  brandName: string,
  brandDescription?: string | null,
  brandWebsite?: string | null
): Promise<Array<{ day: number; topic: string; imagePrompt: string }>> {
  const totalPosts = Math.ceil((duration / 7) * postsPerWeek);
  
  // Build brand context
  let brandContext = `Brand Name: ${brandName}`;
  if (brandDescription) {
    brandContext += `\nBrand Description: ${brandDescription}`;
  }
  if (brandWebsite) {
    brandContext += `\nBrand Website: ${brandWebsite}`;
  }
  
  const prompt = `You are a content strategist for ${brandName}. Generate ${totalPosts} content ideas for a ${duration}-day content calendar.

${brandContext}

Main Topic: ${topic}

Requirements:
- Create ${totalPosts} unique, engaging content ideas that align with the brand's identity and values
- Each idea should be specific and actionable
- Vary content types: tips, how-tos, case studies, statistics, quotes, behind-the-scenes
- Make ideas relevant to both the topic AND the brand's industry/niche
- Include seasonal/trending angles where appropriate
- Consider the brand's target audience and tone
${brandWebsite ? `- Reference the brand's website context when relevant` : ''}

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
      model: GEMINI_MODELS.PRO_PREVIEW,
      maxRetries: 3
    });
    
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse content ideas from AI response");
    }
    
    const ideas = JSON.parse(jsonMatch[0]);
    return ideas;
  } catch (error: any) {
    console.error(`\n[CALENDAR] ❌ Error generating content ideas:`);
    console.error(error);
    
    // Re-throw with more context
    if (error?.message?.includes("high demand") || error?.status === 503 || error?.code === 503) {
      throw new Error("AI service is experiencing high demand. Please try again in a few moments.");
    } else if (error?.message?.includes("rate limit") || error?.status === 429 || error?.code === 429) {
      throw new Error("Rate limit exceeded. Please wait before trying again.");
    }
    
    throw new Error(`Failed to generate content ideas: ${error?.message || 'Unknown error'}`);
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

    // Check brand access and get brand details
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: brandId,
      },
      include: {
        brand: {
          select: {
            name: true,
            description: true,
            website: true,
            logo: true,
          }
        },
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CALENDAR] 🚀 Starting Calendar Generation`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Brand: ${userBrand.brand.name}`);
    if (userBrand.brand.description) {
      console.log(`📝 Description: ${userBrand.brand.description.substring(0, 100)}${userBrand.brand.description.length > 100 ? '...' : ''}`);
    }
    if (userBrand.brand.website) {
      console.log(`🌐 Website: ${userBrand.brand.website}`);
    }
    console.log(`📅 Duration: ${duration} days`);
    console.log(`📝 Topic: ${topic}`);
    console.log(`📊 Posts per week: ${postsPerWeek}`);
    console.log(`🎯 Platforms: ${platforms.join(', ')}`);
    console.log(`${'='.repeat(60)}\n`);

    // Step 1: Generate content ideas
    const totalPosts = Math.ceil((duration / 7) * postsPerWeek);
    console.log(`[CALENDAR] 📝 Step 1/3: Generating ${totalPosts} content ideas...`);
    console.log(`[CALENDAR] ⏳ This may take 10-30 seconds...`);
    
    const startTime = Date.now();
    const contentIdeas = await generateContentIdeas(
      topic,
      duration,
      postsPerWeek,
      userBrand.brand.name,
      userBrand.brand.description,
      userBrand.brand.website
    );
    const ideaGenTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[CALENDAR] ✅ Generated ${contentIdeas.length} content ideas in ${ideaGenTime}s\n`);

    // Step 2: Create calendar in database
    console.log(`[CALENDAR] 💾 Step 2/3: Creating calendar structure...`);
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
    console.log(`[CALENDAR] 📦 Step 3/3: Saving ${contentIdeas.length} calendar items...`);
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

    console.log(`[CALENDAR] ✅ Saved ${contentIdeas.length} items to database\n`);
    console.log(`${'='.repeat(60)}`);
    console.log(`[CALENDAR] 🎉 Calendar structure created successfully!`);
    console.log(`[CALENDAR] 📊 Calendar ID: ${calendar.id}`);
    console.log(`[CALENDAR] 📝 Total items: ${contentIdeas.length}`);
    console.log(`[CALENDAR] ⏭️  Next: Generating captions for each platform...`);
    console.log(`${'='.repeat(60)}\n`);

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
    console.error(`\n${'='.repeat(60)}`);
    console.error("[CALENDAR] ❌ Error generating calendar");
    console.error(`${'='.repeat(60)}`);
    console.error(error);
    console.error(`${'='.repeat(60)}\n`);
    
    // Extract user-friendly error message
    let errorMessage = "Failed to generate content calendar";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("high demand") || error.message.includes("503")) {
        errorMessage = "The AI service is experiencing high demand. Please try again in a few moments.";
        statusCode = 503;
      } else if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "Rate limit exceeded. Please wait a moment before trying again.";
        statusCode = 429;
      } else {
        errorMessage = error.message;
      }
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
