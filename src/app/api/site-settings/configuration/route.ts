// app/api/site-settings/configuration/route.ts
import { prisma } from "@/lib/prisma";
import { getToken } from "next-auth/jwt";
import cloudinary from "@/lib/cloudinary";
import { NextResponse, NextRequest } from "next/server";

// Define proper types for the configuration data
interface SiteConfigUpdateData {
  siteName?: string;
  domain?: string;
  supportEmail?: string;
  whatsappNumber?: string;
  googleAnalyticsId?: string;
  metaPixelId?: string;
  gaPropertyId?: string;
  googleCredentialsBase64?: string;
  metaTitle?: string;
  metaDescription?: string;
  siteImageUrl?: string;
  twitterHandle?: string;
  ogType?: string;
  robotsEnabled?: boolean;
  robotsDisallow?: string;
  robotsAllow?: string;
  sitemapEnabled?: boolean;
  sitemapExtraUrls?: string[];
}

// Type for Prisma error
interface PrismaError extends Error {
  code?: string;
  meta?: {
    column?: string;
    target?: string | string[];
  };
}

async function checkAuth(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ 
    where: { email: token.email! }, 
    include: { role: true } 
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!["ADMIN", "SUPERADMIN"].includes(user.role.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    const config = await prisma.siteConfig.findFirst();

    if (!config) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("Error fetching site configuration:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authError = await checkAuth(request);
    if (authError) return authError;

    const formData = await request.formData();

    const siteName = (formData.get("siteName") as string) ?? undefined;
    const domain = (formData.get("domain") as string) ?? undefined;
    const supportEmail = (formData.get("supportEmail") as string) ?? undefined;
    const whatsappNumber = (formData.get("whatsappNumber") as string) ?? undefined;
    const googleAnalyticsId = (formData.get("googleAnalyticsId") as string) ?? undefined;
    const metaPixelId = (formData.get("metaPixelId") as string) ?? undefined;
    const gaPropertyId = (formData.get("gaPropertyId") as string) ?? undefined;

    // SEO fields
    const metaTitle = (formData.get("metaTitle") as string) ?? undefined;
    const metaDescription = (formData.get("metaDescription") as string) ?? undefined;
    const twitterHandle = (formData.get("twitterHandle") as string) ?? undefined;
    const ogType = (formData.get("ogType") as string) ?? undefined;

    // Crawling/Indexing
    const robotsEnabledRaw = formData.get("robotsEnabled") as string | null;
    const robotsEnabled = robotsEnabledRaw !== null ? robotsEnabledRaw === "true" || robotsEnabledRaw === "on" : undefined;
    const robotsDisallow = (formData.get("robotsDisallow") as string) ?? undefined;
    const robotsAllow = (formData.get("robotsAllow") as string) ?? undefined;
    const sitemapEnabledRaw = formData.get("sitemapEnabled") as string | null;
    const sitemapEnabled = sitemapEnabledRaw !== null ? sitemapEnabledRaw === "true" || sitemapEnabledRaw === "on" : undefined;
    const sitemapExtraUrlsCsv = (formData.get("sitemapExtraUrls") as string) ?? undefined;
    const sitemapExtraUrls = sitemapExtraUrlsCsv !== undefined
      ? sitemapExtraUrlsCsv.split(",").map(s => s.trim()).filter(Boolean)
      : undefined;

    // credentials file upload (JSON) -> base64
    const gaCredentials = formData.get("gaCredentials") as File | null;
    let googleCredentialsBase64: string | undefined = undefined;
    if (gaCredentials && gaCredentials.size > 0) {
      const buf = await gaCredentials.arrayBuffer();
      const bytes = Buffer.from(buf);
      googleCredentialsBase64 = bytes.toString("base64");
    }

    // site image upload (1200x630 recommended) -> Cloudinary URL
    const siteImage = formData.get("siteImage") as File | null;
    let siteImageUrl: string | undefined = undefined;
    if (siteImage && siteImage.size > 0) {
      const buf = Buffer.from(await siteImage.arrayBuffer());
      
      // Type for Cloudinary upload result
      interface CloudinaryUploadResult {
        secure_url?: string;
      }
      
      const uploaded = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "site-settings", resource_type: "image" },
          (error, result) => (error ? reject(error) : resolve(result as CloudinaryUploadResult))
        );
        stream.end(buf);
      });
      siteImageUrl = uploaded?.secure_url;
    }

    const existingConfig = await prisma.siteConfig.findFirst();

    if (!existingConfig) {
      return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
    }

    // Build update data with proper typing
    const updateData: SiteConfigUpdateData = {
      ...(siteName !== undefined && { siteName }),
      ...(domain !== undefined && { domain }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(whatsappNumber !== undefined && { whatsappNumber }),
      ...(googleAnalyticsId !== undefined && { googleAnalyticsId }),
      ...(metaPixelId !== undefined && { metaPixelId }),
      ...(gaPropertyId !== undefined && { gaPropertyId }),
      ...(googleCredentialsBase64 && { googleCredentialsBase64 }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDescription !== undefined && { metaDescription }),
      ...(siteImageUrl && { siteImageUrl }),
      ...(twitterHandle !== undefined && { twitterHandle }),
      ...(ogType !== undefined && { ogType }),
      ...(robotsEnabled !== undefined && { robotsEnabled }),
      ...(robotsDisallow !== undefined && { robotsDisallow }),
      ...(robotsAllow !== undefined && { robotsAllow }),
      ...(sitemapEnabled !== undefined && { sitemapEnabled }),
      ...(sitemapExtraUrls !== undefined && { sitemapExtraUrls }),
    };

    let config;
    try {
      config = await prisma.siteConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
    } catch (error: unknown) {
      console.error("Prisma error updating site configuration:", error);
      
      // Type guard to check if it's a Prisma error
      const prismaError = error as PrismaError;
      
      if (prismaError.code === "P2000") {
        const column = prismaError.meta?.column ?? "unknown";
        return NextResponse.json(
          {
            error: "ValidationError",
            code: "INPUT_TOO_LONG",
            field: column,
            message: `${column} is too long for the allowed size. Please shorten the value and try again.`,
          },
          { status: 400 }
        );
      }
      if (prismaError.code === "P2002") {
        const target = Array.isArray(prismaError.meta?.target)
          ? prismaError.meta.target.join(", ")
          : prismaError.meta?.target ?? "unique constraint";
        return NextResponse.json(
          {
            error: "UniqueConstraintViolation",
            code: "UNIQUE_CONSTRAINT",
            field: target,
            message: `Value already exists for ${target}. Please use a different value.`,
          },
          { status: 400 }
        );
      }
      if (prismaError.code === "P2025") {
        return NextResponse.json(
          {
            error: "NotFound",
            code: "RECORD_NOT_FOUND",
            message: "Configuration record not found.",
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        {
          error: "DatabaseError",
          code: "UNKNOWN_DB_ERROR",
          message: "Failed to update configuration.",
        },
        { status: 400 }
      );
    }

    // Audit log
    try {
      const token = await getToken({ req: request });
      const { logAudit, getRequestIp, getRequestUA } = await import("@/lib/audit");
      await logAudit({
        action: "SITE_CONFIG_UPDATED",
        userId: token?.id,
        resource: "/api/site-settings/configuration",
        ip: getRequestIp(request) ?? undefined,
        userAgent: getRequestUA(request) ?? undefined,
        metadata: { siteName, domain },
      });
    } catch (auditError) {
      console.error("Failed to log audit:", auditError);
    }

    return NextResponse.json({ data: config });
  } catch (error) {
    console.error("Error updating site configuration:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}