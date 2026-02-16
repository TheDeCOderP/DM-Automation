import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a specific calendar item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: itemId } = await params;

    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: itemId },
      include: {
        calendar: {
          include: {
            brand: true,
          },
        },
        postGroup: {
          include: {
            posts: {
              include: {
                media: true,
              },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
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

    return NextResponse.json({ item }, { status: 200 });
  } catch (error) {
    console.error("Error fetching calendar item:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar item" },
      { status: 500 }
    );
  }
}

// PATCH - Update a calendar item
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: itemId } = await params;
    const body = await req.json();

    // Get item and check access
    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: itemId },
      include: {
        calendar: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
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

    // Update item
    const updatedItem = await prisma.contentCalendarItem.update({
      where: { id: itemId },
      data: {
        topic: body.topic,
        captionLinkedIn: body.captionLinkedIn,
        captionTwitter: body.captionTwitter,
        captionInstagram: body.captionInstagram,
        captionFacebook: body.captionFacebook,
        captionYouTube: body.captionYouTube,
        captionPinterest: body.captionPinterest,
        captionReddit: body.captionReddit,
        captionTikTok: body.captionTikTok,
        hashtags: body.hashtags,
        imagePrompt: body.imagePrompt,
        imageUrl: body.imageUrl, // Save the image URL
        suggestedTime: body.suggestedTime ? new Date(body.suggestedTime) : undefined,
        status: body.status || "EDITED", // Mark as edited when user changes it
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Calendar item updated successfully",
        item: updatedItem,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating calendar item:", error);
    return NextResponse.json(
      { error: "Failed to update calendar item" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a calendar item
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: itemId } = await params;

    // Get item and check access
    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: itemId },
      include: {
        calendar: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
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

    // Delete item
    await prisma.contentCalendarItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json(
      { success: true, message: "Calendar item deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting calendar item:", error);
    return NextResponse.json(
      { error: "Failed to delete calendar item" },
      { status: 500 }
    );
  }
}
