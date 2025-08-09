import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const id = request.url.split("/").pop();
  return NextResponse.json({ message: `Hello ${id}` });
}