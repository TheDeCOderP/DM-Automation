import cronParser from "cron-parser"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import cloudinary from "@/lib/cloudinary"
import { NextResponse, type NextRequest } from "next/server"
import { type MediaType, Status, Frequency, type Platform } from "@prisma/client"

import type { ScheduleData } from "@/types/scheduled-data"
import type { UploadApiResponse } from "cloudinary"
// Updated import paths to use standard naming
import { publishToFacebook } from "@/services/facebook.service"
import { publishToLinkedin } from "@/services/linkedin.service"
import { publishToTwitter } from "@/services/twitter.service"

function generateCronExpression(schedule: ScheduleData) {
  const startDate = new Date(schedule.startDate)
  const [hours, minutes] = schedule.startTime.split(":").map(Number)

  startDate.setHours(hours, minutes, 0, 0)

  switch (schedule.frequency) {
    case "once":
      return {
        cron: `${minutes} ${hours} ${startDate.getDate()} ${startDate.getMonth() + 1} *`,
        expiresAt: Math.floor(startDate.getTime() / 1000) + 3600,
      }

    case "minutes":
      return {
        cron: `*/${schedule.interval || 15} * * * *`,
        expiresAt: 0,
      }

    case "daily":
      return {
        cron: `${minutes} ${hours} * * *`,
        expiresAt: 0,
      }

    case "monthly":
      return {
        cron: `${minutes} ${hours} ${schedule.dayOfMonth || startDate.getDate()} * *`,
        expiresAt: 0,
      }

    case "yearly":
      return {
        cron: `${minutes} ${hours} ${schedule.dayOfMonth || startDate.getDate()} ${schedule.month || startDate.getMonth() + 1} *`,
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
        pageToken: true,
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
    const brandId = formData.get("brandId") as string
    const accounts = JSON.parse(formData.get("accounts") as string)
    const pageTokenIds = JSON.parse((formData.get("pageTokenIds") as string) || "[]")
    const captions = JSON.parse(formData.get("captions") as string)
    const schedule = JSON.parse((formData.get("schedule") as string) || "null")

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

    let scheduledAt, status, frequency, cronExpression, expiresAt

    if (schedule) {
      const startDate = new Date(schedule.startDate)
      const [hours, minutes] = schedule.startTime.split(":").map(Number)
      scheduledAt = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        hours,
        minutes,
        0,
        0,
      ).toISOString()
      status = Status.SCHEDULED
      frequency = schedule.frequency.toUpperCase() as Frequency
      ;({ cron: cronExpression, expiresAt } = generateCronExpression(schedule))
    } else {
      scheduledAt = new Date().toISOString()
      status = Status.PUBLISHED
      frequency = Frequency.ONCE
      cronExpression = null
      expiresAt = null
    }

    const createdPosts = []

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

      // Skip Facebook accounts if Facebook pages are selected (pages are more specific)
      if (socialAccount.platform === "FACEBOOK" && pageTokenIds.length > 0) {
        console.log(`Skipping general Facebook account ${accountId} because specific Facebook pages are selected`)
        continue
      }

      const caption = captions[socialAccount.platform as Platform]
      if (!caption) continue

      const post = await prisma.post.create({
        data: {
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

    for (const pageTokenId of pageTokenIds) {
      const pageToken = await prisma.pageToken.findUnique({
        where: { id: pageTokenId },
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

      if (!pageToken) {
        console.error(`Page token with ID ${pageTokenId} not found.`)
        continue
      }

      // Check if the social account (which owns the page token) belongs to the current brand
      const belongsToBrand = pageToken.socialAccount.brands.some(
        (socialAccountBrand) => socialAccountBrand.brandId === brandId
      )

      if (!belongsToBrand) {
        console.error(`Page token with ID ${pageTokenId} doesn't belong to brand ${brandId}.`)
        continue
      }

      const caption = captions["FACEBOOK"]
      if (!caption) continue

      const post = await prisma.post.create({
        data: {
          content: caption,
          platform: "FACEBOOK",
          scheduledAt: scheduledAt,
          status: status,
          userId: token.id,
          brandId: brandId,
          frequency: frequency,
          pageTokenId: pageTokenId,
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

    // Only create a cron job if the post is scheduled
    if (schedule) {
      const callbackUrl = `${process.env.NEXTAUTH_URL}/api/cron-jobs/publish-post`
      const scheduleData = {
        job: {
          url: callbackUrl,
          enabled: true,
          saveResponse: true,
          schedule: {
            timezone: "IST",
            expiresAt: expiresAt,
            hours: [-1],
            mdays: [-1],
            minutes: [-1],
            months: [-1],
            wdays: [-1],
            cronExpression: cronExpression,
          },
        },
      }

      const response = await fetch("https://api.cron-job.org/jobs", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_JOB_API_KEY}`,
        },
        body: JSON.stringify(scheduleData),
      })

      const responseData = await response.json()
      if (!response.ok) {
        console.error("Cron job creation failed:", {
          status: response.status,
          statusText: response.statusText,
          error: responseData,
        })
        throw new Error(`Failed to create cron job: ${response.statusText} - ${JSON.stringify(responseData)}`)
      }

      console.log("Cron job created:", responseData)
    } else {
      const now = new Date()

      for (const post of createdPosts) {
        try {
          console.log(`Processing post ${post.id} scheduled for ${post.scheduledAt}`)

          if (post.platform === "LINKEDIN") {
            await publishToLinkedin(post)
          } else if (post.platform === "TWITTER") {
            await publishToTwitter(post)
          } else if (post.platform === "FACEBOOK") {
            if (post.pageTokenId) {
              const pageToken = await prisma.pageToken.findUnique({
                where: { id: post.pageTokenId },
              })
              if (pageToken) {
                await publishToFacebook(post)
              } else {
                throw new Error(`Page token not found for post ${post.id}`)
              }
            } else {
              await publishToFacebook(post)
            }
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

    return NextResponse.json({ posts: createdPosts }, { status: 201 })
  } catch (error) {
    console.log("Error creating post:", error)
    return NextResponse.json({ error: `Error creating post ${error}` }, { status: 500 })
  }
}