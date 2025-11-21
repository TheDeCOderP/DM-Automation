import cronParser from "cron-parser"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
import { NextResponse, type NextRequest } from "next/server"
import { type MediaType, Status, Frequency, type Platform } from "@prisma/client"

import type { ScheduleData } from "@/types/scheduled-data"
import type { UploadApiResponse } from "cloudinary"

import { publishToTwitter } from "@/services/twitter.service";
import { publishToYouTube } from "@/services/youtube.service";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToPinterest } from "@/services/pinterest.service";
import { publishToLinkedin, publishToLinkedInPage } from "@/services/linkedin.service";
import { publishToReddit } from "@/services/reddit.service"
import { publishToInstagram } from "@/services/instagram.service"
import { publishToTikTok } from "@/services/tiktok.service"

function generateCronExpression(schedule: ScheduleData) {
  // Convert the user's local date/time + offset to UTC components for cron
  const [hours, minutes] = schedule.startTime.split(":").map(Number)

  // Normalize startDate to string YYYY-MM-DD
  const startDateStr = typeof schedule.startDate === "string"
    ? schedule.startDate
    : new Date(schedule.startDate).toISOString().split("T")[0]

  const [y, m, d] = startDateStr.split("-").map(Number)
  const offset = schedule.timezoneOffset ?? 0 // minutes to add to local to get UTC

  let totalMins = hours * 60 + minutes + offset // UTC = local + offset
  let dayAdjust = 0
  if (totalMins < 0) { totalMins += 1440; dayAdjust = -1 }
  if (totalMins >= 1440) { totalMins -= 1440; dayAdjust = 1 }

  const utcHours = Math.floor(totalMins / 60)
  const utcMinutes = totalMins % 60
  const baseDateUtc = new Date(Date.UTC(y, m - 1, d + dayAdjust, 0, 0, 0, 0))
  const utcDay = baseDateUtc.getUTCDate()
  const utcMonth = baseDateUtc.getUTCMonth() + 1

  switch (schedule.frequency) {
    case "once":
      return {
        // Run once at the exact UTC H:M on the (possibly adjusted) day/month
        cron: `${utcMinutes} ${utcHours} ${utcDay} ${utcMonth} *`,
        // expire one hour after trigger time
        expiresAt: Math.floor(Date.UTC(baseDateUtc.getUTCFullYear(), baseDateUtc.getUTCMonth(), baseDateUtc.getUTCDate(), utcHours, utcMinutes, 0) / 1000) + 3600,
      }

    case "minutes":
      return {
        cron: `*/${schedule.interval || 15} * * * *`,
        expiresAt: 0,
      }

    case "daily":
      return {
        // At the UTC time every day
        cron: `${utcMinutes} ${utcHours} * * *`,
        expiresAt: 0,
      }

    case "monthly":
      return {
        cron: `${utcMinutes} ${utcHours} ${schedule.dayOfMonth || utcDay} * *`,
        expiresAt: 0,
      }

    case "yearly":
      return {
        cron: `${utcMinutes} ${utcHours} ${schedule.dayOfMonth || utcDay} ${schedule.month || utcMonth} *`,
        expiresAt: 0,
      }

    case "custom":
      try {
        cronParser.parse(schedule.customExpression ?? "")
        return {
          cron: schedule.customExpression,
          expiresAt: 0,
        }
      } catch (error) {
        throw new Error("Invalid custom cron expression: " + error)
      }

    default:
      throw new Error("Invalid frequency")
  }
}

// Helper function to convert cron expression to cron-job.org format
function convertCronToScheduleFormat(cronExpression: string, expiresAt: number) {
  const parts = cronExpression.split(' ')
  
  if (parts.length === 5) {
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
    
    return {
      timezone: 'UTC',
      expiresAt: expiresAt,
      // Convert minute part
      minutes: minute === '*' ? [-1] : minute.startsWith('*/') ? 
        Array.from({length: Math.floor(60 / parseInt(minute.substring(2)))}, (_, i) => i * parseInt(minute.substring(2))) :
        minute.split(',').map(m => parseInt(m)),
      // Convert hour part  
      hours: hour === '*' ? [-1] : hour.startsWith('*/') ?
        Array.from({length: Math.floor(24 / parseInt(hour.substring(2)))}, (_, i) => i * parseInt(hour.substring(2))) :
        hour.split(',').map(h => parseInt(h)),
      // Convert day of month part
      mdays: dayOfMonth === '*' ? [-1] : dayOfMonth.split(',').map(d => parseInt(d)),
      // Convert month part
      months: month === '*' ? [-1] : month.split(',').map(m => parseInt(m)),
      // Convert day of week part (cron uses 0-7, cron-job.org uses 0-6)
      wdays: dayOfWeek === '*' ? [-1] : dayOfWeek.split(',').map(w => {
        const day = parseInt(w)
        return day === 7 ? 0 : day // Convert Sunday from 7 to 0
      })
    }
  }
  
  // Fallback for invalid cron format
  throw new Error(`Invalid cron expression format: ${cronExpression}`)
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "12")
    const skip = (page - 1) * limit

    // Get total count for pagination
    const totalPosts = await prisma.post.count({
      where: {
        userId: token.id,
      },
    })

    const posts = await prisma.post.findMany({
      where: {
        userId: token.id,
        status: {
          in: ["SCHEDULED", "PUBLISHED"],
        },
      },
      include: {
        media: true,
        brand: true,
        socialAccountPage: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(totalPosts / limit)

    return NextResponse.json({ 
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    }, { status: 200 })
  } catch (error) {
    console.log("Error fetching posts:", error)
    return NextResponse.json({ error: `Error fetching posts ${error}` }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  try {
    const formData = await req.formData()

    // Parse JSON data from FormData
    const title = formData.get("title") as string;
    const brandId = formData.get("brandId") as string;
    const accounts = JSON.parse(formData.get("accounts") as string);
    const socialAccountPageIds = JSON.parse((formData.get("socialAccountPageIds") as string) || "[]");
    const captions = JSON.parse(formData.get("captions") as string);
    const schedule = JSON.parse((formData.get("schedule") as string) || "null");

    const userBrand = await prisma.userBrand.findFirst({
      where: {
        userId: token.id,
        brandId: brandId,
      },
    })

    if (!userBrand) {
      return NextResponse.json({ error: "You don't have access to this brand" }, { status: 403 })
    }

    // Get files from FormData
    const files = formData.getAll("files") as File[]

    // Upload media files first
    const mediaUrls: { url: string; type: MediaType }[] = []
    if (files && files.length > 0) {
      for (const file of files) {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                resource_type: "auto",
              },
              (error, result) => {
                if (error) reject(error)
                else resolve(result)
              },
            )
            .end(buffer)
        })

        mediaUrls.push({
          url: (uploadResult as UploadApiResponse).secure_url,
          type: (uploadResult as UploadApiResponse).resource_type.toUpperCase() as MediaType,
        })
      }
    }

    let scheduledAt, status, frequency, cronExpression, expiresAt;
    if (schedule) {
      const startDate = new Date(schedule.startDate) // "2025-09-17"
      const [hours, minutes] = schedule.startTime.split(":").map(Number)
      const userOffsetMinutes = schedule.timezoneOffset ?? 0

      const utcDate = new Date(Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
        hours,
        minutes,
        0,
        0
      ));

      // Convert local time to UTC: UTC = local + offset (getTimezoneOffset minutes)
      utcDate.setMinutes(utcDate.getMinutes() + userOffsetMinutes)
      scheduledAt = utcDate.toISOString()

      status = Status.SCHEDULED
      frequency = schedule.frequency.toUpperCase() as Frequency
      ;({ cron: cronExpression, expiresAt } = generateCronExpression(schedule))
      console.log("Generated cron:", cronExpression, "timezone:", "UTC", "scheduledAt:", scheduledAt)
    } else {
      scheduledAt = new Date().toISOString();
      status = Status.PUBLISHED;
      frequency = Frequency.ONCE;
      cronExpression = null;
      expiresAt = null;
    }

    const createdPosts = []

    // PROCESS SOCIAL ACCOUNT PAGES FIRST (FIX: This ensures pages are processed even when no accounts are selected)
    for (const socialAccountPageId of socialAccountPageIds) {
      const socialAccountPage = await prisma.socialAccountPage.findUnique({
        where: { id: socialAccountPageId },
        include: {
          socialAccount: {
            include: {
              brands: {
                include: {
                  brand: true
                }
              }
            },
          },
        },
      })

      if (!socialAccountPage) {
        console.error(`Page token with ID ${socialAccountPageId} not found.`)
        continue
      }

      // Check if the social account (which owns the page token) belongs to the current brand
      const belongsToBrand = socialAccountPage.socialAccount.brands.some(
        (socialAccountBrand) => socialAccountBrand.brandId === brandId
      )

      if (!belongsToBrand) {
        console.error(`Page token with ID ${socialAccountPageId} doesn't belong to brand ${brandId}.`)
        continue
      }

      // Determine platform and caption based on socialAccountPage platform
      const platform = socialAccountPage.platform
      const caption = captions[platform]
      if (!caption) continue

      const post = await prisma.post.create({
        data: {
          title: title,
          content: caption,
          platform: platform,
          scheduledAt: scheduledAt,
          status: status,
          userId: token.id,
          brandId: brandId,
          frequency: frequency,
          socialAccountPageId: socialAccountPageId,
        },
      })

      // Attach media to each post
      if (mediaUrls.length > 0) {
        for (const media of mediaUrls) {
          await prisma.media.create({
            data: {
              postId: post.id,
              userId: token.id,
              brandId: brandId,
              url: media.url,
              type: media.type,
            },
          })
        }
      }

      createdPosts.push(post)
    }

    // THEN PROCESS REGULAR SOCIAL ACCOUNTS (but skip if pages of the same platform are selected)
    for (const accountId of accounts) {
      // Get social account with its brands to check if it belongs to the current brand
      const socialAccount = await prisma.socialAccount.findUnique({
        where: { id: accountId },
        include: {
          brands: {
            include: {
              brand: true
            }
          }
        },
      })

      if (!socialAccount) {
        console.error(`Social account with ID ${accountId} not found.`)
        continue
      }

      // Check if the social account belongs to the current brand
      const belongsToBrand = socialAccount.brands.some(
        (socialAccountBrand) => socialAccountBrand.brandId === brandId
      )

      if (!belongsToBrand) {
        console.error(`Social account with ID ${accountId} doesn't belong to brand ${brandId}.`)
        continue
      }

      // Skip LinkedIn accounts if LinkedIn pages are selected (pages are more specific)
      if (socialAccount.platform === "LINKEDIN" && socialAccountPageIds.length > 0) {
        // Check if any of the selected page tokens are LinkedIn pages
        const linkedinPages = await prisma.socialAccountPage.findMany({
          where: {
            id: { in: socialAccountPageIds },
            platform: "LINKEDIN"
          }
        });
        
        if (linkedinPages.length > 0) {
          console.log(`Skipping general LinkedIn account ${accountId} because specific LinkedIn pages are selected`)
          continue;
        }
      }

      // Skip Facebook accounts if Facebook pages are selected (pages are more specific)
      if (socialAccount.platform === "FACEBOOK" && socialAccountPageIds.length > 0) {
        const facebookPages = await prisma.socialAccountPage.findMany({
          where: {
            id: { in: socialAccountPageIds },
            platform: "FACEBOOK"
          }
        });
        
        if (facebookPages.length > 0) {
          console.log(`Skipping general Facebook account ${accountId} because specific Facebook pages are selected`)
          continue;
        }
      }

      const caption = captions[socialAccount.platform as Platform]
      if (!caption) continue

      const post = await prisma.post.create({
        data: {
          title: title,
          content: caption,
          platform: socialAccount.platform,
          scheduledAt: scheduledAt,
          status: status,
          userId: token.id,
          brandId: brandId,
          frequency: frequency,
        },
      })

      if (mediaUrls.length > 0) {
        for (const media of mediaUrls) {
          await prisma.media.create({
            data: {
              postId: post.id,
              userId: token.id,
              brandId: brandId,
              url: media.url,
              type: media.type,
            },
          })
        }
      }

      createdPosts.push(post)
    }

    // Only create a cron job if the post is scheduled
    if (schedule && cronExpression) {
      const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-post`
      
      try {
        // Convert cron expression to cron-job.org schedule format
        const scheduleFormat = convertCronToScheduleFormat(cronExpression, expiresAt || 0)
        
        const scheduleData = {
          job: {
            title: `Post Schedule - User: ${token.id} - ${new Date().toISOString()}`,
            url: callbackUrl,
            enabled: true,
            saveResponses: true,
            schedule: scheduleFormat,
            requestMethod: 1, // POST method
            // You might want to include post IDs or other metadata in the request body
            extendedData: {
              body: JSON.stringify({
                postIds: createdPosts.map(p => p.id),
                userId: token.id,
                brandId: brandId
              })
            }
          },
        };

        console.log("Creating cron job with schedule:", JSON.stringify(scheduleFormat, null, 2))

        const response = await fetch("https://api.cron-job.org/jobs", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer RDnkbD0orjf+MLPMfmeix/ZgqW49Bv0nFmGCijETocY=`,
          },
          body: JSON.stringify(scheduleData),
        })

        const responseData = await response.json()
        if (!response.ok) {
          console.error("Cron job creation failed:", {
            status: response.status,
            statusText: response.statusText,
            error: responseData,
            sentData: scheduleData
          })
          throw new Error(`Failed to create cron job: ${response.statusText} - ${JSON.stringify(responseData)}`)
        }

        console.log("Cron job created successfully:", responseData)
      } catch (cronError) {
        console.error("Error creating cron job:", cronError)
        // You might want to handle this error differently - maybe still save the posts but mark them as failed to schedule
        throw new Error(`Failed to schedule posts: ${cronError}`)
      }
    } else {
      // Immediate publishing
      const now = new Date()

      for (const post of createdPosts) {
        try {
          console.log(`Processing post ${post.id} scheduled for ${post.scheduledAt}`)

          if (post.platform === "LINKEDIN") {
            if (post.socialAccountPageId) {
              // This is a LinkedIn Page post
              await publishToLinkedInPage(post);
            } else {
              // This is a LinkedIn personal post
              await publishToLinkedin(post)
            }
          } else if(post.platform === "FACEBOOK") {
            await publishToFacebook(post)
          } else if (post.platform === "TWITTER") {
            await publishToTwitter(post)
          } else if(post.platform === "YOUTUBE") {
            await publishToYouTube(post)
          } else if(post.platform === "PINTEREST") {
            await publishToPinterest(post)
          } else if(post.platform === "REDDIT") {
            await publishToReddit(post);
          } else if(post.platform === "INSTAGRAM") {
            await publishToInstagram(post);
          } else if(post.platform === "TIKTOK") {
            await publishToTikTok(post);
          }

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "PUBLISHED",
              publishedAt: now,
              updatedAt: now,
            },
          })
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          console.error(`Failed to process post ${post.id}:`, errorMessage)

          await prisma.post.update({
            where: { id: post.id },
            data: {
              status: "FAILED",
              updatedAt: now,
            },
          })

          await prisma.notification.create({
            data: {
              userId: post.userId,
              type: "POST_FAILED",
              title: "Post Failed",
              message: `Failed to publish your post on ${post.platform}`,
              metadata: {
                postId: post.id,
                platform: post.platform,
                error: errorMessage,
              },
            },
          })
        }
      }
    }

    const postGroup = await prisma.postGroup.create({
      data: {
        posts: {
          connect: createdPosts.map(p => ({ id: p.id }))
        }
      }
    })

    await prisma.post.updateMany({
      where: { id: { in: createdPosts.map(p => p.id) } },
      data: { postGroupId: postGroup.id }
    })

    return NextResponse.json({ posts: createdPosts }, { status: 201 })
  } catch (error) {
    console.log("Error creating post:", error)
    return NextResponse.json({ error: `Error creating post ${error}` }, { status: 500 })
  }
}