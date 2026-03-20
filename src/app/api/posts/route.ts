import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/prisma"
import { uploadFile } from "@/lib/upload"
import { NextResponse, type NextRequest } from "next/server"
import { type MediaType, Status, Frequency, type Platform } from "@prisma/client"

import { publishToTwitter } from "@/services/twitter.service";
import { publishToYouTube } from "@/services/youtube.service";
import { publishToFacebook } from "@/services/facebook.service";
import { publishToPinterest } from "@/services/pinterest.service";
import { publishToLinkedin, publishToLinkedInPage } from "@/services/linkedin.service";
import { publishToReddit } from "@/services/reddit.service"
import { publishToInstagram } from "@/services/instagram.service"
import { publishToTikTok } from "@/services/tiktok.service"

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
    const brandId = searchParams.get("brandId")
    const platform = searchParams.get("platform")
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Get all brands the user has access to
    const userBrands = await prisma.userBrand.findMany({
      where: { userId: token.id },
      select: { brandId: true, brand: { select: { id: true, name: true, logo: true } } }
    })

    const brandIds = userBrands.map(ub => ub.brandId)

    // Build where clause
    const whereClause: Record<string, unknown> = {
      brandId: brandId && brandIds.includes(brandId) ? brandId : { in: brandIds },
    }

    if (platform && platform !== "ALL") {
      whereClause.platform = platform as Platform
    }

    if (status && status !== "ALL") {
      whereClause.status = status as Status
    } else {
      whereClause.status = { in: [Status.SCHEDULED, Status.PUBLISHED, Status.DRAFTED, Status.FAILED] }
    }

    if (search) {
      whereClause.OR = [
        { content: { contains: search } },
        { title: { contains: search } },
      ]
    }

    // Get total count for pagination
    const totalPosts = await prisma.post.count({ where: whereClause })

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        media: true,
        brand: true,
        socialAccountPage: true,
        socialAccount: {
          select: {
            platform: true,
            platformUsername: true,
            platformUserImage: true,
          }
        },
        user: {
          select: {
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(totalPosts / limit)
    const brands = userBrands.map(ub => ub.brand)

    return NextResponse.json({ 
      posts,
      brands,
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
        try {
          // Use unified upload with Local CDN as primary, Cloudinary as fallback
          const url = await uploadFile(file, 'social-posts');
          
          // Determine media type from file
          let type: MediaType = 'IMAGE';
          if (file.type.startsWith('video/')) {
            type = 'VIDEO';
          } else if (file.type.startsWith('image/')) {
            type = 'IMAGE';
          }
          
          mediaUrls.push({ url, type });
        } catch (error) {
          console.error('Error uploading media file:', error);
          throw new Error(`Failed to upload media: ${file.name}`);
        }
      }
    }

    let scheduledAt, status, frequency;
    if (schedule) {
      const startDate = new Date(schedule.startDate)
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

      utcDate.setMinutes(utcDate.getMinutes() + userOffsetMinutes)
      scheduledAt = utcDate.toISOString()

      status = Status.SCHEDULED
      
      const frequencyMap: Record<string, Frequency> = {
        'once': Frequency.ONCE,
        'minutes': Frequency.HOURLY,
        'daily': Frequency.DAILY,
        'monthly': Frequency.MONTHLY,
        'yearly': Frequency.MONTHLY,
        'custom': Frequency.ONCE,
      };
      
      frequency = frequencyMap[schedule.frequency.toLowerCase()] || Frequency.ONCE;
      console.log("Post scheduled for UTC:", scheduledAt)
    } else {
      scheduledAt = new Date().toISOString();
      status = Status.PUBLISHED;
      frequency = Frequency.ONCE;
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
          socialAccountId: accountId, // Save which social account to use
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

    // VPS cron job runs every minute and picks up all posts where scheduledAt <= now
    // No need to register with external cron service
    if (schedule) {
      console.log(`[SCHEDULE] ${createdPosts.length} post(s) saved with scheduledAt=${scheduledAt}, VPS cron will publish them automatically.`)
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