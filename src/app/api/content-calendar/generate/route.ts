import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithThinking, GEMINI_MODELS } from "@/lib/gemini";
import { Platform } from "@prisma/client";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface PublicHoliday {
  date: string;       // "YYYY-MM-DD"
  name: string;       // English name
  localName: string;  // Native language name
  global: boolean;
  types: string[];
}

interface GenerateCalendarRequest {
  brandId: string;
  topic: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  platforms: Platform[];
  postsPerWeek: number;
  tone?: string;
  ctaStyle?: string;
  targetAudience?: string;
  language?: string;
  hashtagCount?: number;
  contentPillars?: string[];
  customInstructions?: string;
  // Holiday fields
  holidays?: PublicHoliday[];
  countryCode?: string;
}

/**
 * Fetch public holidays from Nager.Date for a given country and year range.
 * Called server-side so we avoid CORS issues and can cache if needed.
 */
async function fetchPublicHolidays(
  countryCode: string,
  startDate: Date,
  endDate: Date
): Promise<PublicHoliday[]> {
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();
  const allHolidays: PublicHoliday[] = [];

  for (let year = startYear; year <= endYear; year++) {
    try {
      const res = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
        { next: { revalidate: 86400 } } // cache 24 hours
      );
      if (!res.ok) {
        console.warn(`[HOLIDAYS] ⚠️  Could not fetch holidays for ${countryCode}/${year}: ${res.status}`);
        continue;
      }
      const data: PublicHoliday[] = await res.json();
      allHolidays.push(...data);
    } catch (err) {
      console.warn(`[HOLIDAYS] ⚠️  Fetch error for ${countryCode}/${year}:`, err);
    }
  }

  // Filter to date range
  return allHolidays.filter((h) => {
    const d = new Date(h.date);
    return d >= startDate && d <= endDate;
  });
}

/**
 * Format holidays into a human-readable string for the AI prompt.
 */
function formatHolidaysForPrompt(holidays: PublicHoliday[]): string {
  if (!holidays.length) return "";
  return holidays
    .map((h) => `  - ${h.date} → ${h.name}${h.localName !== h.name ? ` (${h.localName})` : ""}`)
    .join("\n");
}

async function generateContentIdeas(
  topic: string,
  duration: number,
  postsPerWeek: number,
  brandName: string,
  startDate: Date,
  brandDescription?: string | null,
  brandWebsite?: string | null,
  options?: {
    tone?: string;
    targetAudience?: string;
    contentPillars?: string[];
    customInstructions?: string;
    holidays?: PublicHoliday[];
    countryCode?: string;
  }
): Promise<Array<{ day: number; topic: string; imagePrompt: string }>> {
  const totalPosts = Math.ceil((duration / 7) * postsPerWeek);

  let brandContext = `Brand Name: ${brandName}`;
  if (brandDescription) brandContext += `\nBrand Description: ${brandDescription}`;
  if (brandWebsite) brandContext += `\nBrand Website: ${brandWebsite}`;

  const toneNote = options?.tone ? `\n- Tone/Voice: ${options.tone}` : '';
  const audienceNote = options?.targetAudience ? `\n- Target Audience: ${options.targetAudience}` : '';
  const pillarsNote = options?.contentPillars?.length
    ? `\n- Content Pillars to use: ${options.contentPillars.join(', ')}`
    : '';
  const customNote = options?.customInstructions ? `\n- Custom Instructions: ${options.customInstructions}` : '';

  // Build holiday section
  let holidaySection = "";
  if (options?.holidays && options.holidays.length > 0) {
    const holidayList = formatHolidaysForPrompt(options.holidays);
    const countryLabel = options.countryCode ? ` (${options.countryCode})` : "";
    holidaySection = `

HOLIDAY CALENDAR${countryLabel}:
The following public holidays fall within this content calendar period. You MUST:
1. Create at least one dedicated post FOR each holiday on that exact date (day offset = holiday date - calendar start date in days). 
2. For major holidays (Christmas, New Year, Independence Day, Diwali, Eid, etc.), create a post 1-2 days BEFORE as a "coming up" teaser as well.
3. Holiday posts should be warm, celebratory, and tie back to the brand naturally.
4. Remaining post slots should be filled with regular topic-based content.

Holidays in range:
${holidayList}

When assigning the "day" field, calculate it as: (holiday date - start date) in days + 1.
Calendar start date: ${startDate.toISOString().split("T")[0]}
`;
  }

  const prompt = `You are a content strategist for ${brandName}. Generate ${totalPosts} content ideas for a ${duration}-day content calendar.

${brandContext}

Main Topic: ${topic}

Requirements:
- Create ${totalPosts} unique, engaging content ideas that align with the brand's identity and values
- Each idea should be specific and actionable
- Vary content types: tips, how-tos, case studies, statistics, quotes, behind-the-scenes
- Make ideas relevant to both the topic AND the brand's industry/niche
- Include seasonal/trending angles where appropriate${toneNote}${audienceNote}${pillarsNote}${customNote}
${brandWebsite ? `- Reference the brand's website context when relevant` : ''}${holidaySection}

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

Generate exactly ${totalPosts} content ideas now, ensuring holiday posts are included on the correct days:`;

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
    const {
      brandId, topic, duration, startDate, endDate, platforms, postsPerWeek,
      tone, ctaStyle, targetAudience, language, hashtagCount, contentPillars, customInstructions,
      // Holiday fields — client may send pre-fetched holidays, or we fetch server-side
      holidays: clientHolidays,
      countryCode,
    } = body;

    // Validate input
    if (!brandId || !topic || !duration || !platforms || !postsPerWeek) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (duration < 7 || duration > 90) {
      return NextResponse.json({ error: "Duration must be between 7 and 90 days" }, { status: 400 });
    }
    if (postsPerWeek < 1 || postsPerWeek > 14) {
      return NextResponse.json({ error: "Posts per week must be between 1 and 14" }, { status: 400 });
    }

    // Check brand access
    const userBrand = await prisma.userBrand.findFirst({
      where: { userId: token.id, brandId },
      include: {
        brand: {
          select: { name: true, description: true, website: true, logo: true },
        },
      },
    });

    if (!userBrand) {
      return NextResponse.json({ error: "You don't have access to this brand" }, { status: 403 });
    }

    const calendarStart = startDate ? new Date(startDate) : new Date();
    const calendarEnd = endDate ? new Date(endDate) : (() => {
      const d = new Date(calendarStart);
      d.setDate(d.getDate() + duration);
      return d;
    })();

    // ── Holiday resolution ──────────────────────────────────────────────────
    // Priority: client already fetched → use those.
    // Fallback: countryCode provided → fetch server-side (useful for API-only consumers).
    let resolvedHolidays: PublicHoliday[] = [];

    if (clientHolidays && clientHolidays.length > 0) {
      // Client sent holidays from the modal preview — use them directly
      resolvedHolidays = clientHolidays;
      console.log(`[CALENDAR] 🎉 Using ${resolvedHolidays.length} client-provided holidays`);
    } else if (countryCode) {
      // No client holidays but country selected → fetch server-side
      console.log(`[CALENDAR] 🌍 Fetching holidays for ${countryCode} (${calendarStart.toISOString().split("T")[0]} → ${calendarEnd.toISOString().split("T")[0]})...`);
      resolvedHolidays = await fetchPublicHolidays(countryCode, calendarStart, calendarEnd);
      console.log(`[CALENDAR] 🎉 Found ${resolvedHolidays.length} holidays in range`);
    }

    if (resolvedHolidays.length > 0) {
      console.log(`[CALENDAR] 📅 Holidays to include:`);
      resolvedHolidays.forEach((h) => console.log(`  • ${h.date} — ${h.name}`));
    }
    // ───────────────────────────────────────────────────────────────────────

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CALENDAR] 🚀 Starting Calendar Generation`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📋 Brand: ${userBrand.brand.name}`);
    console.log(`📅 Duration: ${duration} days | Start: ${calendarStart.toISOString().split("T")[0]}`);
    console.log(`📝 Topic: ${topic}`);
    console.log(`📊 Posts/week: ${postsPerWeek} | Platforms: ${platforms.join(', ')}`);
    if (resolvedHolidays.length > 0) {
      console.log(`🎉 Holiday-aware: YES (${resolvedHolidays.length} holidays, country: ${countryCode})`);
    }
    console.log(`${'='.repeat(60)}\n`);

    // Step 1: Generate content ideas (with or without holiday context)
    const totalPosts = Math.ceil((duration / 7) * postsPerWeek);
    console.log(`[CALENDAR] 📝 Step 1/3: Generating ${totalPosts} content ideas...`);

    const startTime = Date.now();
    const contentIdeas = await generateContentIdeas(
      topic,
      duration,
      postsPerWeek,
      userBrand.brand.name,
      calendarStart,
      userBrand.brand.description,
      userBrand.brand.website,
      {
        tone,
        targetAudience,
        contentPillars,
        customInstructions,
        holidays: resolvedHolidays.length > 0 ? resolvedHolidays : undefined,
        countryCode,
      }
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
        startDate: calendarStart,
        endDate: calendarEnd,
        platforms,
        postsPerWeek,
        status: "DRAFT",
      },
    });

    // Step 3: Save calendar items
    console.log(`[CALENDAR] 📦 Step 3/3: Saving ${contentIdeas.length} calendar items...`);

    // Build a lookup of holiday dates for tagging items
    const holidayDateSet = new Set(resolvedHolidays.map((h) => h.date));
    const holidayByDate = Object.fromEntries(resolvedHolidays.map((h) => [h.date, h.name]));

    await prisma.contentCalendarItem.createMany({
      data: contentIdeas.map((idea) => {
        // Compute the actual date for this post
        const postDate = new Date(calendarStart);
        postDate.setDate(postDate.getDate() + (idea.day - 1));
        const postDateStr = postDate.toISOString().split("T")[0];

        const isHolidayPost = holidayDateSet.has(postDateStr);
        const holidayName = isHolidayPost ? holidayByDate[postDateStr] : undefined;

        return {
          calendarId: calendar.id,
          day: idea.day,
          topic: idea.topic,
          hashtags: [],
          imagePrompt: idea.imagePrompt,
          suggestedTime: calculateSuggestedTime(idea.day, platforms[0]),
          status: "DRAFT",
          // Store holiday metadata in the topic or a notes field if your schema supports it
          // If you have a `notes` or `holidayName` field, use it:
          // holidayName: holidayName ?? null,
        };
      }),
    });

    console.log(`[CALENDAR] ✅ Saved ${contentIdeas.length} items to database`);
    if (resolvedHolidays.length > 0) {
      console.log(`[CALENDAR] 🎉 Holiday-aware posts embedded for: ${resolvedHolidays.map(h => h.name).join(', ')}`);
    }
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CALENDAR] 🎉 Calendar structure created! ID: ${calendar.id}`);
    console.log(`${'='.repeat(60)}\n`);

    const completeCalendar = await prisma.contentCalendar.findUnique({
      where: { id: calendar.id },
      include: {
        items: { orderBy: { day: "asc" } },
        brand: { select: { name: true, logo: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Content calendar structure created. Generating captions...",
        calendar: completeCalendar,
        needsCaptions: true,
        holidaysIncluded: resolvedHolidays.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`\n[CALENDAR] ❌ Error generating calendar`, error);

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
      { error: errorMessage, details: error instanceof Error ? error.message : "Unknown error" },
      { status: statusCode }
    );
  }
}