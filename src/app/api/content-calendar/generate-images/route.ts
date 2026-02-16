import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/gemini";
import { uploadBase64 } from "@/lib/upload";
import { Platform } from "@prisma/client";

interface GenerateImagesRequest {
  calendarId: string;
  itemIds?: string[]; // Optional: generate for specific items only
}

// Platform-specific dimensions and aspect ratios
// Based on official social media image size recommendations
const PLATFORM_IMAGE_SPECS: Record<string, {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  width: number;
  height: number;
  description: string;
}> = {
  LINKEDIN: {
    aspectRatio: '1:1',
    width: 1200,
    height: 1200,
    description: 'LinkedIn post (square format for best visibility)'
  },
  TWITTER: {
    aspectRatio: '16:9',
    width: 1200,
    height: 675,
    description: 'Twitter/X post (landscape format)'
  },
  INSTAGRAM: {
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
    description: 'Instagram feed post (square format)'
  },
  FACEBOOK: {
    aspectRatio: '1:1',
    width: 1200,
    height: 1200,
    description: 'Facebook post (square format works best)'
  },
  YOUTUBE: {
    aspectRatio: '16:9',
    width: 1280,
    height: 720,
    description: 'YouTube thumbnail (HD landscape)'
  },
  PINTEREST: {
    aspectRatio: '3:4',
    width: 1000,
    height: 1500,
    description: 'Pinterest pin (portrait format)'
  },
  REDDIT: {
    aspectRatio: '16:9',
    width: 1200,
    height: 675,
    description: 'Reddit post (landscape format)'
  },
  TIKTOK: {
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
    description: 'TikTok video thumbnail (vertical format)'
  },
};

// Get reference image URL based on aspect ratio
function getReferenceImageUrl(aspectRatio: string): string {
  const fileMap: Record<string, string> = {
    '1:1': '/reference-images/square-1-1.png',
    '16:9': '/reference-images/landscape-16-9.png',
    '9:16': '/reference-images/portrait-9-16.png',
    '4:3': '/reference-images/standard-4-3.png',
    '3:4': '/reference-images/portrait-3-4.png',
  };
  
  return fileMap[aspectRatio] || fileMap['1:1'];
}

// Fetch reference image and convert to base64
async function loadReferenceImageBase64(aspectRatio: string, baseUrl: string): Promise<string | null> {
  try {
    const imageUrl = getReferenceImageUrl(aspectRatio);
    const fullUrl = `${baseUrl}${imageUrl}`;
    
    console.log(`[IMAGE-GEN] Fetching reference image: ${fullUrl}`);
    
    const response = await fetch(fullUrl);
    if (!response.ok) {
      console.warn(`[IMAGE-GEN] Reference image not found: ${fullUrl}`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('[IMAGE-GEN] Error loading reference image:', error);
    return null;
  }
}

// Determine best image specs for platforms
function getBestImageSpecs(platforms: Platform[]): {
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  width: number;
  height: number;
  description: string;
} {
  // Filter out 'ALL' platform
  const validPlatforms = platforms.filter(p => p !== 'ALL');
  
  if (validPlatforms.length === 0) {
    return PLATFORM_IMAGE_SPECS['INSTAGRAM']; // Default to Instagram specs
  }
  
  // Get specs for all platforms
  const platformSpecs = validPlatforms.map(p => PLATFORM_IMAGE_SPECS[p]).filter(Boolean);
  
  if (platformSpecs.length === 0) {
    return PLATFORM_IMAGE_SPECS['INSTAGRAM']; // Default
  }
  
  // Count aspect ratio occurrences
  const aspectRatioCounts: Record<string, number> = {};
  platformSpecs.forEach(spec => {
    aspectRatioCounts[spec.aspectRatio] = (aspectRatioCounts[spec.aspectRatio] || 0) + 1;
  });
  
  // Get most common aspect ratio
  const mostCommonRatio = Object.entries(aspectRatioCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  
  // Find a spec with that aspect ratio and use the highest resolution
  const specsWithRatio = platformSpecs.filter(s => s.aspectRatio === mostCommonRatio);
  const bestSpec = specsWithRatio.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
  
  return bestSpec;
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: GenerateImagesRequest = await req.json();
    const { calendarId, itemIds } = body;

    if (!calendarId) {
      return NextResponse.json(
        { error: "calendarId is required" },
        { status: 400 }
      );
    }

    // Get calendar with items
    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
      include: {
        items: {
          where: itemIds ? { id: { in: itemIds } } : {},
          orderBy: { day: "asc" },
        },
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

    console.log(`[IMAGE-GEN] Generating images for ${calendar.items.length} items`);

    // Determine best image specs for this calendar
    const platforms = calendar.platforms as Platform[];
    const imageSpecs = getBestImageSpecs(platforms);
    console.log(`[IMAGE-GEN] Using image specs:`, {
      aspectRatio: imageSpecs.aspectRatio,
      dimensions: `${imageSpecs.width}x${imageSpecs.height}`,
      platforms: platforms.filter(p => p !== 'ALL'),
      description: imageSpecs.description
    });

    // Get base URL for reference images
    const baseUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get('host')}`;

    // Load reference image (optional - for dimension guidance)
    const referenceImageBase64 = await loadReferenceImageBase64(imageSpecs.aspectRatio, baseUrl);
    if (!referenceImageBase64) {
      console.warn('[IMAGE-GEN] No reference image found, proceeding without it');
    }

    const results = [];
    const errors = [];
    const BATCH_SIZE = 3; // Process 3 images at a time to avoid timeout

    // Generate images in batches
    const itemsToProcess = calendar.items.filter(item => !item.imageUrl && item.imagePrompt);
    
    for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
      const batch = itemsToProcess.slice(i, i + BATCH_SIZE);
      console.log(`[IMAGE-GEN] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(itemsToProcess.length / BATCH_SIZE)}`);

      // Process batch sequentially to avoid rate limits
      for (const item of batch) {
        try {
          console.log(`[IMAGE-GEN] Generating image for day ${item.day}: ${item.topic}`);

          // Enhanced prompt with specific dimensions
          const enhancedPrompt = `Create a high-quality, professional, visually appealing image for social media posting.

Target Platforms: ${platforms.filter(p => p !== 'ALL').join(', ')}
Image Dimensions: ${imageSpecs.width}x${imageSpecs.height} pixels (${imageSpecs.aspectRatio} aspect ratio)
Format: ${imageSpecs.description}

Content Description: ${item.imagePrompt}

Requirements:
- High resolution and sharp (${imageSpecs.width}x${imageSpecs.height}px)
- Well-composed with good lighting
- Optimized for ${imageSpecs.aspectRatio} aspect ratio
- Suitable for social media platforms
- Engaging and attention-grabbing
- Professional quality
- Vibrant colors and clear details
- No text overlays (text will be added separately)
- Modern, clean aesthetic`;

          // Generate image with Gemini
          const imageResult = await generateImage(enhancedPrompt, {
            aspectRatio: imageSpecs.aspectRatio,
            numberOfImages: 1,
          });

          if (!imageResult.images || imageResult.images.length === 0) {
            throw new Error("No image generated");
          }

          // Upload image to media-cdn
          const base64Data = `data:image/png;base64,${imageResult.images[0]}`;
          const fileName = `calendar-${calendarId}-day-${item.day}-${Date.now()}.png`;
          const imageUrl = await uploadBase64(base64Data, fileName, 'content-calendar');

          // Update item with image URL
          await prisma.contentCalendarItem.update({
            where: { id: item.id },
            data: { imageUrl },
          });

          console.log(`[IMAGE-GEN] ✓ Generated image for day ${item.day}: ${imageUrl}`);
          results.push({
            itemId: item.id,
            day: item.day,
            imageUrl,
            success: true,
          });
        } catch (error) {
          console.error(`[IMAGE-GEN] Error generating image for day ${item.day}:`, error);
          errors.push({
            itemId: item.id,
            day: item.day,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }

    console.log(`[IMAGE-GEN] ✓ Generated ${results.length} images with ${errors.length} errors`);

    return NextResponse.json(
      {
        success: true,
        message: `Generated ${results.length} images`,
        generated: results.length,
        errors: errors.length > 0 ? errors : undefined,
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[IMAGE-GEN] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate images",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
