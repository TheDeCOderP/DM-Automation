import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import imagekit from '@/lib/imagekit';

// Utility: slugify text
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
}

// Utility: set CORS headers
function setCORSHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}

// ✅ OPTIONS handler (for preflight)
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 204 });
  return setCORSHeaders(response);
}

// ✅ GET - Fetch all banners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get('type');
    const typeFilters = rawType
      ?.split(',')
      .map((value) => slugify(value.trim()))
      .filter((value) => value.length > 0);

    const bannersDb = await prisma.banner.findMany({
      where:
        typeFilters && typeFilters.length > 0
          ? {
              type:
                typeFilters.length === 1
                  ? typeFilters[0]
                  : { in: typeFilters },
            }
          : undefined,
      orderBy: { createdAt: 'desc' },
    });

    const banners = bannersDb.map((banner) => ({
      ...banner,
      typeLabel: banner.typeLabel ?? null,
    }));

    const response = NextResponse.json(banners);
    return setCORSHeaders(response);
  } catch (error) {
    console.error('GET Error:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    );
    return setCORSHeaders(response);
  }
}

// Helper - Upload file to ImageKit
async function uploadToImageKit(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');

    console.log('Uploading to ImageKit:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    const result = await imagekit.upload({
      file: base64,
      fileName: file.name,
      folder: '/banners',
    });

    console.log('ImageKit upload result:', {
      fileId: result.fileId,
      url: result.url
    });

    return result;
  } catch (error: any) {
    console.error('ImageKit upload error details:', {
      message: error.message,
      stack: error.stack,
      error: error
    });
    throw new Error(`ImageKit upload failed: ${error.message}`);
  }
}

// ✅ POST - Create a new banner
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST request received ===');
    
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
      console.log('FormData parsed successfully');
    } catch (error: any) {
      console.error('Failed to parse FormData:', error);
      const response = NextResponse.json(
        { error: 'Invalid form data', details: error.message },
        { status: 400 }
      );
      return setCORSHeaders(response);
    }

    // Extract fields
    const title = formData.get('title') as string;
    const rawType = formData.get('type') as string;
    const typeLabel = formData.get('typeLabel') as string | null;
    const redirectUrl = formData.get('redirectUrl') as string | null;
    const isActive = formData.get('isActive') === 'true';
    const file = formData.get('file') as File | null;

    console.log('Extracted form fields:', {
      title,
      rawType,
      typeLabel,
      redirectUrl,
      isActive,
      hasFile: !!file,
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type
    });

    // Validate required fields
    if (!title || !rawType || !file) {
      console.error('Missing required fields:', {
        hasTitle: !!title,
        hasRawType: !!rawType,
        hasFile: !!file
      });
      const response = NextResponse.json(
        { error: 'Title, type, and banner image are required' },
        { status: 400 }
      );
      return setCORSHeaders(response);
    }

    // Validate file size
    if (file.size > 10 * 1024 * 1024) {
      console.error('File too large:', file.size);
      const response = NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
      return setCORSHeaders(response);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      const response = NextResponse.json(
        { error: 'Only image files (JPEG, PNG, GIF, WebP) are allowed' },
        { status: 400 }
      );
      return setCORSHeaders(response);
    }

    // Slugify the type for consistent storage
    const type = slugify(rawType);
    console.log('Slugified type:', { rawType, type });

    // Upload to ImageKit
    console.log('Starting ImageKit upload...');
    let uploadResult;
    try {
      uploadResult = await uploadToImageKit(file);
      console.log('ImageKit upload successful:', uploadResult.url);
    } catch (error: any) {
      console.error('ImageKit upload failed:', error);
      const response = NextResponse.json(
        { error: 'Failed to upload image', details: error.message },
        { status: 500 }
      );
      return setCORSHeaders(response);
    }

    // Create banner in database
    console.log('Creating banner in database...');
    let banner;
    try {
      banner = await prisma.banner.create({
        data: {
          title,
          type,
          typeLabel: typeLabel || rawType,
          imageUrl: uploadResult.url,
          imagePublicId: uploadResult.fileId,
          redirectUrl: redirectUrl || null,
          isActive,
        },
      });
      console.log('Banner created successfully:', banner.id);
    } catch (error: any) {
      console.error('Database error:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      
      // If database fails, try to delete uploaded image
      try {
        await imagekit.deleteFile(uploadResult.fileId);
        console.log('Cleaned up uploaded image after database error');
      } catch (cleanupError) {
        console.error('Failed to cleanup image:', cleanupError);
      }

      const response = NextResponse.json(
        { error: 'Failed to save banner to database', details: error.message },
        { status: 500 }
      );
      return setCORSHeaders(response);
    }

    const response = NextResponse.json(banner, { status: 201 });
    return setCORSHeaders(response);
  } catch (error: any) {
    console.error('=== Unexpected POST Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    
    const response = NextResponse.json(
      { 
        error: 'Failed to create banner', 
        details: error.message,
        type: error.constructor.name
      },
      { status: 500 }
    );
    return setCORSHeaders(response);
  }
}