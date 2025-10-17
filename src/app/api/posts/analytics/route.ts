import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new NextResponse("Unauthorized", { status: 401 });

  try {
    // Fetch the user's posts and their views
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log("Error fetching analytics:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}