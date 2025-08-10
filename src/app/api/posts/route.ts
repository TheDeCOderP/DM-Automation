import cronParser from 'cron-parser';
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { NextResponse, NextRequest } from "next/server";
import { MediaType, Status, Frequency, Platform } from "@prisma/client";

import { ScheduleData } from '@/types/scheduled-data';
import { UploadApiResponse } from 'cloudinary';

function generateCronExpression(schedule: ScheduleData) {
  const startDate = new Date(schedule.startDate);
  const [hours, minutes] = schedule.startTime.split(':').map(Number);
  
  // Set the time on the start date
  startDate.setHours(hours, minutes, 0, 0);
  
  switch (schedule.frequency) {
    case 'once':
      // For one-time schedules, we'll just use the exact date/time
      // But cron doesn't support one-time, so we'll create a daily that expires after first run
      return {
        cron: `${minutes} ${hours} ${startDate.getDate()} ${startDate.getMonth() + 1} *`,
        expiresAt: Math.floor(startDate.getTime() / 1000) + 3600 // 1 hour after execution
      };
    
    case 'minutes':
      return {
        cron: `*/${schedule.interval || 15} * * * *`,
        expiresAt: 0 // never expires
      };
    
    case 'daily':
      return {
        cron: `${minutes} ${hours} * * *`,
        expiresAt: 0
      };
    
    case 'monthly':
      return {
        cron: `${minutes} ${hours} ${schedule.dayOfMonth || startDate.getDate()} * *`,
        expiresAt: 0
      };
    
    case 'yearly':
      return {
        cron: `${minutes} ${hours} ${schedule.dayOfMonth || startDate.getDate()} ${schedule.month || startDate.getMonth() + 1} *`,
        expiresAt: 0
      };
    
    case 'custom':
      // Validate custom expression
      try {
        cronParser.parse(schedule.customExpression ?? '');
        return {
          cron: schedule.customExpression,
          expiresAt: 0
        };
      } catch (error) {
        throw new Error('Invalid custom cron expression: ' + error);
      }
    
    default:
      throw new Error('Invalid frequency');
  }
}

export async function GET(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const posts = await prisma.post.findMany({
            where: {
                userId: token.id,
            },
        });

        if(!posts){
            throw new Error("No posts found");
        }

        return NextResponse.json({ posts }, { status: 200 });      
    } catch (error) {
        console.log("Error fetching posts:", error);
        return NextResponse.json(
            { error: `Error fetching posts ${error}`},
            {status: 500}
        );
    }
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req });
    if (!token?.id) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    try {
        const formData = await req.formData();
        
        // Parse JSON data from FormData
        const captions = JSON.parse(formData.get('captions') as string);
        const schedule = JSON.parse(formData.get('schedule') as string);
        
        // Get files from FormData
        const files = formData.getAll('files') as File[];
        
        // Upload media files first
        const mediaUrls: { url: string; type: MediaType }[] = [];
        if (files && files.length > 0) {
            for (const file of files) {
                // Convert File to buffer for Cloudinary upload
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);
                
                // Upload to Cloudinary using buffer
                const uploadResult = await new Promise((resolve, reject) => {
                    cloudinary.uploader.upload_stream(
                        {
                            resource_type: "auto", // Let Cloudinary detect the type
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    ).end(buffer);
                });
                
                mediaUrls.push({
                    url: (uploadResult as UploadApiResponse).secure_url,
                    type: (uploadResult as UploadApiResponse).resource_type.toUpperCase() as MediaType
                });
            }
        }

        // Generate cron expression from schedule
        const { cron: cronExpression, expiresAt } = generateCronExpression(schedule);
        
        // Create posts for each platform with caption
        const createdPosts = [];
        for (const platform in captions) {
            const caption = captions[platform as Platform];
            if (!caption) continue; // Skip if no caption for this platform

            const post = await prisma.post.create({
                data: {
                    content: caption,
                    caption: caption,
                    platform: platform as Platform,
                    scheduledAt: new Date(schedule.startDate),
                    status: Status.SCHEDULED,
                    userId: token.id,
                    frequency: schedule.frequency.toUpperCase() as Frequency,
                },
            });

            // Attach media to each post
            if (mediaUrls.length > 0) {
                for (const media of mediaUrls) {
                    await prisma.media.create({
                        data: {
                            postId: post.id,
                            userId: token.id,
                            url: media.url,
                            type: media.type,
                        },
                    });
                }
            }

            createdPosts.push(post);
        }

        // Create cron job for scheduling posts
        const callbackUrl = `${req.headers.get('origin')}/api/cron-jobs/publish-post`;
        const scheduleData = {
            job: {
                url: callbackUrl,
                enabled: true,
                saveResponse: true,
                schedule: {
                    timezone: "IST",
                    expiresAt: expiresAt,
                    hours: [-1], // -1 means use the cron expression
                    mdays: [-1],
                    minutes: [-1],
                    months: [-1],
                    wdays: [-1],
                    cronExpression: cronExpression
                }
            }
        };

        const response = await fetch('https://api.cron-job.org/jobs', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CRON_JOB_API_KEY}`
            },
            body: JSON.stringify(scheduleData)
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error('Cron job creation failed:', {
                status: response.status,
                statusText: response.statusText,
                error: responseData
            });
            throw new Error(`Failed to create cron job: ${response.statusText} - ${JSON.stringify(responseData)}`);
        }

        console.log("Cron job created:", responseData);

        return NextResponse.json({ posts: createdPosts }, { status: 201 });
    } catch (error) {
        console.log("Error creating post:", error);
        return NextResponse.json(
            { error: `Error creating post ${error}`},
            {status: 500}
        );
    }
}