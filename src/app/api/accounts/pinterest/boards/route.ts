import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token || !token.sub) return new Response("Unauthorized", { status: 401 });

  try {
    return NextResponse.json({ sucess: true }, { status: 200 });
  } catch (error) {
    console.log("Error while fetching boards:", error);
    return NextResponse.json({ error: `Something went wrong` }, { status: 500 });
  }
}