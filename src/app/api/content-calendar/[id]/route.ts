import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Get a specific calendar with all items
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: calendarId } = await params;

    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
      include: {
        items: {
          orderBy: { day: "asc" },
          include: {
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
        },
        brand: {
          select: {
            name: true,
            logo: true,
          },
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

    return NextResponse.json({ calendar }, { status: 200 });
  } catch (error) {
    console.error("Error fetching calendar:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    );
  }
}

// PATCH - Update calendar status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: calendarId } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !["DRAFT", "SCHEDULED", "COMPLETED"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Get calendar and check access
    const calendar = await prisma.contentCalendar.findUnique({
      where: { id: calendarId },
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

    // Update calendar status
    const updatedCalendar = await prisma.contentCalendar.update({
      where: { id: calendarId },
      data: { status },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Calendar updated successfully",
        calendar: updatedCalendar,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating calendar:", error);
    return NextResponse.json(
      { error: "Failed to update calendar" },
      { status: 500 }
    );
  }
}
