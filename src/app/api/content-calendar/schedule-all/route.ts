import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Platform, Status, Frequency } from "@prisma/client";
import cronParser from "cron-parser";

interface ScheduleAllRequest {
  calendarId: string;
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
      minutes:
        minute === "*"
          ? [-1]
          : minute.startsWith("*/")
          ? Array.from(
              { length: Math.floor(60 / parseInt(minute.substring(2))) },
              (_, i) => i * parseInt(minute.substring(2))
            )
          : minute.split(",").map((m) => parseInt(m)),
      hours:
        hour === "*"
          ? [-1]
          : hour.startsWith("*/")
          ? Array.from(
              { length: Math.floor(24 / parseInt(hour.substring(2))) },
              (_, i) => i * parseInt(hour.substring(2))
            )
          : hour.split(",").map((h) => parseInt(h)),
      mdays:
        dayOfMonth === "*" ? [-1] : dayOfMonth.split(",").map((d) => parseInt(d)),
      months: month === "*" ? [-1] : month.split(",").map((m) => parseInt(m)),
      wdays:
        dayOfWeek === "*"
          ? [-1]
          : dayOfWeek.split(",").map((w) => {
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
    const body: ScheduleAllRequest = await req.json();
    const { calendarId, accountSelections } = body;

    if (!calendarId || !accountSelections || accountSelections.length === 0) {
      return NextResponse.json(
        { error: "calendarId and accountSelections are required" },
        { status: 400 }
      );
    }

    // Get calendar with all items
    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
      include: {
        items: {
          where: {
            status: {
              in: ["DRAFT", "EDITED"], // Only schedule items that haven't been scheduled yet
            },
          },
          orderBy: { day: "asc" },
        },
        brand: true,
      },
    });

    if (!calendar) {
      return NextResponse.json(
        { error: "Calendar not found" },
        { status: 404 }
      );
    }

    // Check brand access
    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: calendar.brandId,
      },
    });

    if (!userBrand) {
      return NextResponse.json(
        { error: "You don't have access to this brand" },
        { status: 403 }
      );
    }

    console.log(`[SCHEDULE-ALL] Scheduling ${calendar.items.length} calendar items in batches`);

    const createdPosts = [];
    const errors = [];
    const BATCH_SIZE = 5; // Process 5 items at a time to avoid timeout

    // Process calendar items in batches
    for (let i = 0; i < calendar.items.length; i += BATCH_SIZE) {
      const batch = calendar.items.slice(i, i + BATCH_SIZE);
      console.log(`[SCHEDULE-ALL] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(calendar.items.length / BATCH_SIZE)}`);

      // Process each item in the batch
      for (const item of batch) {
      try {
        // Validate that item has suggested time
        if (!item.suggestedTime) {
          console.warn(`[SCHEDULE-ALL] Skipping day ${item.day} - no suggested time`);
          errors.push({
            day: item.day,
            error: "No suggested time set",
          });
          continue;
        }

        // Create a post group for this calendar item
        const postGroup = await prisma.postGroup.create({
          data: {},
        });

        let postsCreatedForItem = 0;

        // Create posts for each account selection
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
            console.warn(`[SCHEDULE-ALL] No caption for ${platform} on day ${item.day}, skipping`);
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
            brandId: calendar.brandId,
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
                brandId: calendar.brandId,
              }
            };
          }

          // Create post for this specific account/page combination
          const post = await prisma.post.create({
            data: postData,
          });

          createdPosts.push(post);
          postsCreatedForItem++;
          const accountInfo = selection.socialAccountPageId 
            ? `page ${selection.socialAccountPageId}` 
            : `account ${selection.socialAccountId}`;
          console.log(`[SCHEDULE-ALL] Created ${platform} post for ${accountInfo} on day ${item.day}`);
        }

        // Only link calendar item if at least one post was created
        if (postsCreatedForItem > 0) {
          await prisma.contentCalendarItem.update({
            where: { id: item.id },
            data: {
              postGroupId: postGroup.id,
              status: "SCHEDULED",
            },
          });
        } else {
          // Delete empty post group
          await prisma.postGroup.delete({
            where: { id: postGroup.id },
          });
          errors.push({
            day: item.day,
            error: "No posts created - missing captions for selected platforms",
          });
          continue;
        }

        // Create cron job for this post group
        const { cron, expiresAt } = generateCronExpression(item.suggestedTime);
        const scheduleFormat = convertCronToScheduleFormat(cron, expiresAt);
        const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-post`;

          const scheduleData = {
            job: {
              title: `Calendar Post - Day ${item.day} - ${calendar.topic}`,
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
                  brandId: calendar.brandId,
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

            console.log(`[SCHEDULE-ALL] Created cron job for day ${item.day}`);
          } catch (cronError) {
            console.error(`[SCHEDULE-ALL] Cron job error for day ${item.day}:`, cronError);
            errors.push({
              day: item.day,
              error: "Failed to create cron job",
            });
          }
        } catch (itemError) {
        console.error(`[SCHEDULE-ALL] Error processing day ${item.day}:`, itemError);
        errors.push({
          day: item.day,
          error: itemError instanceof Error ? itemError.message : "Unknown error",
        });
      }
    }
  }

    // Update calendar status
    await prisma.contentCalendar.update({
      where: { id: calendarId },
      data: {
        status: "SCHEDULED",
      },
    });

    console.log(
      `[SCHEDULE-ALL] ✓ Scheduled ${createdPosts.length} posts with ${errors.length} errors`
    );

    return NextResponse.json(
      {
        success: true,
        message: "Calendar scheduled successfully",
        scheduled: createdPosts.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[SCHEDULE-ALL] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to schedule calendar",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
