import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Create a new calendar item manually
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { calendarId, ...itemData } = body;

    if (!calendarId) {
      return NextResponse.json(
        { error: "calendarId is required" },
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

    // Create item
    const item = await prisma.contentCalendarItem.create({
      data: {
        calendarId,
        ...itemData,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Calendar item created successfully",
        item,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating calendar item:", error);
    return NextResponse.json(
      { error: "Failed to create calendar item" },
      { status: 500 }
    );
  }
}
