import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const platformUserId = searchParams.get("platformUserId");

    if (!platformUserId || typeof platformUserId !== 'string') throw new Error('Invalid user id');

    const account = await prisma.socialAccount.findFirst({
        where: {
            platformUserId: platformUserId,
            platform: "FACEBOOK",
            isConnected: true
        },
        select: { accessToken: true }
    });

    const facebookResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${account?.accessToken}`);

    if(!facebookResponse.ok){
      throw new Error('Failed to fetch Facebook pages');
    }

    const facebookData = await facebookResponse.json();

    if (facebookData.error) {
      throw new Error(facebookData.error.message);
    }

    const pages = facebookData.data.map((page: { id: string; name: string; }) => ({
      id: page.id,
      name: page.name,
    }));

    return NextResponse.json({ message: 'Facebook pages fetched successfully', pages: pages });

  } catch (error) {
    console.log("Error fetching Facebook pages:", error);
    return NextResponse.json({ error }, { status: 500 });
  }
}