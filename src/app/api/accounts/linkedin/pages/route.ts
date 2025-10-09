import { decryptToken } from "@/lib/encryption";
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get("brandId") || "cmg55wej30003jy04xqw6sqff";
    if (!brandId) {
      return NextResponse.json({ error: "Brand Id not provided" }, { status: 400 });
    }

    const userSocialAccount = await prisma.userSocialAccount.findFirst({
      where: {
        OR: [
          {
            socialAccount: {
              platform: "LINKEDIN",
              brands: {
                some: { brandId },
              },
            },
            user: {
              brands: {
                some: { brandId },
              },
            },
          },
        ],
      },
      include: {
        socialAccount: true,
        user: true,
      },
    });

    const accessToken = await decryptToken(userSocialAccount?.socialAccount.accessToken || "");

    // Fetch pages/organizations where the user has admin access
    const pagesResponse = await fetch(
      `https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(id,localizedName,vanityName,logoV2)))`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "LinkedIn-Version": "202402",
        },
      }
    );

    if (!pagesResponse.ok) {
      console.error(pagesResponse);
      throw new Error(`Failed to fetch LinkedIn pages: ${pagesResponse.statusText}`);
    }

    const pagesData = await pagesResponse.json();
    console.log("Pages Data:", pagesData);

    if (!pagesData.elements || pagesData.elements.length === 0) {
      return NextResponse.json([]); // ✅ correct
    }

    // Example transformation (optional)
    // const pages = pagesData.elements.map((element) => {
    //   const org = element["organization~"];
    //   return {
    //     id: org.id,
    //     name: org.localizedName,
    //     vanityName: org.vanityName,
    //     role: "ADMINISTRATOR",
    //     logoUrl: org.logoV2?.originalUrl,
    //   };
    // });

    // return NextResponse.json(pages); // ✅ correct
    return NextResponse.json([]); // ✅ correct return type
  } catch (error) {
    console.error("Error fetching LinkedIn pages:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 }); // ✅ always return a Response
  }
}
