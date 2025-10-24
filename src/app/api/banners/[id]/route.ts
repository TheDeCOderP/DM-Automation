import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import imagekit from '@/lib/imagekit';

async function uploadToImageKit(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString('base64');

  try {
    const result = await imagekit.upload({
      file: base64,
      fileName: file.name,
      folder: '/banners',
    });
    return result;
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw error;
  }
}

// PUT - Update a banner
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') as string;
    const type = formData.get('type') as string;
    const redirectUrl = formData.get('redirectUrl') as string | null;
    const isActive = formData.get('isActive') === 'true';
    const file = formData.get('file') as File | null;

    const existingBanner = await prisma.banner.findUnique({
      where: { id: params.id },
    });

    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    let imageUrl = existingBanner.imageUrl;
    let imagePublicId = existingBanner.imagePublicId ?? null;

    if (file) {
      // Delete old image from ImageKit
      if (imagePublicId) {
        try {
          await imagekit.deleteFile(imagePublicId);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }

      // Upload new image
      const uploadResult = await uploadToImageKit(file);
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.fileId;
    }

    const banner = await prisma.banner.update({
      where: { id: params.id },
      data: {
        title,
        type,
        imageUrl,
        imagePublicId,
        redirectUrl: redirectUrl || null,
        isActive,
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingBanner = await prisma.banner.findUnique({
      where: { id: params.id },
    });

    if (!existingBanner) {
      return NextResponse.json({ error: 'Banner not found' }, { status: 404 });
    }

    // Delete from ImageKit
    if (existingBanner.imagePublicId) {
      try {
        await imagekit.deleteFile(existingBanner.imagePublicId);
      } catch (error) {
        console.error('Error deleting image from ImageKit:', error);
      }
    }

    await prisma.banner.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}