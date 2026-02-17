import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, Status, Frequency } from "@prisma/client";

interface ScheduleItemRequest {
  itemId: string;
  accountSelections: {
    platform: string;
    socialAccountId: string;
    socialAccountPageId: string | null;
  }[];
}

// Helper function to generate cron expression for one-time post
function generateCronExpression(scheduledAt: Date) {
  const utcDate = new Date(scheduledAt);
  const minutes = utcDate.getUTCMinutes();
  const hours = utcDate.getUTCHours();
  const day = utcDate.getUTCDate();
  const month = utcDate.getUTCMonth() + 1;

  return {
    cron: `${minutes} ${hours} ${day} ${month} *`,
    expiresAt: Math.floor(utcDate.getTime() / 1000) + 3600, // Expire 1 hour after
  };
}

// Helper function to convert cron expression to cron-job.org format
function convertCronToScheduleFormat(cronExpression: string, expiresAt: number) {
  const parts = cronExpression.split(" ");

  if (parts.length === 5) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    return {
      timezone: "UTC",
      expiresAt: expiresAt,
      minutes: minute === "*" ? [-1] : minute.split(",").map((m) => parseInt(m)),
      hours: hour === "*" ? [-1] : hour.split(",").map((h) => parseInt(h)),
      mdays: dayOfMonth === "*" ? [-1] : dayOfMonth.split(",").map((d) => parseInt(d)),
      months: month === "*" ? [-1] : month.split(",").map((m) => parseInt(m)),
      wdays: dayOfWeek === "*" ? [-1] : dayOfWeek.split(",").map((w) => {
        const day = parseInt(w);
        return day === 7 ? 0 : day;
      }),
    };
  }

  throw new Error(`Invalid cron expression format: ${cronExpression}`);
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: ScheduleItemRequest = await req.json();
    const { itemId, accountSelections } = body;

    if (!itemId || !accountSelections || accountSelections.length === 0) {
      return NextResponse.json(
        { error: "itemId and accountSelections are required" },
        { status: 400 }
      );
    }

    // Get calendar item
    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: itemId },
      include: {
        calendar: {
          include: {
            brand: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Calendar item not found" },
        { status: 404 }
      );
    }

    // Check brand access
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: item.calendar.brandId,
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    if (!item.suggestedTime) {
      return NextResponse.json(
        { error: "Item must have a suggested time" },
        { status: 400 }
      );
    }

    console.log(`[SCHEDULE-ITEM] Scheduling calendar item day ${item.day}`);

    // Validate that at least one platform has content
    let hasValidContent = false;
    for (const selection of accountSelections) {
      const platform = selection.platform as Platform;
      let caption = "";
      if (platform === "LINKEDIN") caption = item.captionLinkedIn || "";
      else if (platform === "TWITTER") caption = item.captionTwitter || "";
      else if (platform === "INSTAGRAM") caption = item.captionInstagram || "";
      else if (platform === "FACEBOOK") caption = item.captionFacebook || "";
      else if (platform === "YOUTUBE") caption = item.captionYouTube || "";
      else if (platform === "PINTEREST") caption = item.captionPinterest || "";
      else if (platform === "REDDIT") caption = item.captionReddit || "";
      else if (platform === "TIKTOK") caption = item.captionTikTok || "";
      
      if (caption) {
        hasValidContent = true;
        break;
      }
    }

    if (!hasValidContent) {
      return NextResponse.json(
        { error: "No content available for selected platforms. Please add captions first." },
        { status: 400 }
      );
    }

    // Create a post group for this calendar item
    const postGroup = await prisma.postGroup.create({
      data: {},
    });

    const createdPosts = [];

    // Create posts for each selected account/page combination
    for (const selection of accountSelections) {
      const platform = selection.platform as Platform;
      
      // Get caption for this platform
      let caption = "";
      if (platform === "LINKEDIN") caption = item.captionLinkedIn || "";
      else if (platform === "TWITTER") caption = item.captionTwitter || "";
      else if (platform === "INSTAGRAM") caption = item.captionInstagram || "";
      else if (platform === "FACEBOOK") caption = item.captionFacebook || "";
      else if (platform === "YOUTUBE") caption = item.captionYouTube || "";
      else if (platform === "PINTEREST") caption = item.captionPinterest || "";
      else if (platform === "REDDIT") caption = item.captionReddit || "";
      else if (platform === "TIKTOK") caption = item.captionTikTok || "";

      if (!caption) {
        console.warn(`[SCHEDULE-ITEM] No caption for ${platform} on day ${item.day}, skipping`);
        continue;
      }

      // Prepare post data
      const postData: any = {
        title: item.topic,
        content: caption,
        platform: platform,
        scheduledAt: item.suggestedTime,
        status: Status.SCHEDULED,
        frequency: Frequency.ONCE,
        url: null,
        userId: token.id,
        brandId: item.calendar.brandId,
        socialAccountId: selection.socialAccountId,
        socialAccountPageId: selection.socialAccountPageId,
        postGroupId: postGroup.id,
        platformMetadata: {
          hashtags: item.hashtags,
          imageUrl: item.imageUrl,
          calendarItemId: item.id,
        },
      };

      // Add media if image exists
      if (item.imageUrl) {
        postData.media = {
          create: {
            url: item.imageUrl,
            type: "IMAGE",
            userId: token.id,
            brandId: item.calendar.brandId,
          }
        };
      }

      // Create post for this specific account/page combination
      const post = await prisma.post.create({
        data: postData,
      });

      createdPosts.push(post);
      const accountInfo = selection.socialAccountPageId 
        ? `page ${selection.socialAccountPageId}` 
        : `account ${selection.socialAccountId}`;
      console.log(`[SCHEDULE-ITEM] Created ${platform} post for ${accountInfo} on day ${item.day}`);
    }

    // Validate that at least one post was created
    if (createdPosts.length === 0) {
      // Rollback: delete the post group
      await prisma.postGroup.delete({
        where: { id: postGroup.id },
      });
      
      return NextResponse.json(
        { error: "No posts were created. Please check that captions exist for the selected platforms." },
        { status: 400 }
      );
    }

    // Link calendar item to post group only after posts are successfully created
    await prisma.contentCalendarItem.update({
      where: { id: item.id },
      data: {
        postGroupId: postGroup.id,
        status: "SCHEDULED",
      },
    });

    // Create cron job for this post group
    const { cron, expiresAt } = generateCronExpression(item.suggestedTime);
    const scheduleFormat = convertCronToScheduleFormat(cron, expiresAt);
    const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-post`;

    const scheduleData = {
      job: {
        title: `Calendar Post - Day ${item.day} - ${item.calendar.topic}`,
        url: callbackUrl,
        enabled: true,
        saveResponses: true,
        schedule: scheduleFormat,
        requestMethod: 1,
        requestTimeout: 30,
        extendedData: {
          headers: {
            Authorization: `Bearer ${process.env.CRON_SECRET_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postGroupId: postGroup.id,
            calendarItemId: item.id,
            userId: token.id,
            brandId: item.calendar.brandId,
          }),
        },
      },
    };

    try {
      const response = await fetch("https://api.cron-job.org/jobs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_JOB_API_KEY}`,
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cron job creation failed: ${JSON.stringify(errorData)}`);
      }

      console.log(`[SCHEDULE-ITEM] Created cron job for day ${item.day}`);
    } catch (cronError) {
      console.error(`[SCHEDULE-ITEM] Cron job error:`, cronError);
      // Don't fail the whole operation if cron job fails
    }

    console.log(`[SCHEDULE-ITEM] ✓ Scheduled ${createdPosts.length} posts`);

    return NextResponse.json(
      {
        success: true,
        message: "Post scheduled successfully",
        scheduled: createdPosts.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SCHEDULE-ITEM] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to schedule post",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
