import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function robots(): Promise<MetadataRoute.Robots> {
  try {
    const config = await prisma.siteConfig.findFirst();
    const domain = config?.domain?.replace(/\/$/, "");
    const base = domain?.startsWith("http") ? domain : domain ? `https://${domain}` : undefined;

    // Defaults
    const allowLines = (config?.robotsAllow || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const disallowLines = (config?.robotsDisallow || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);

    if (config && config.robotsEnabled === false) {
      return {
        rules: [{ userAgent: "*", disallow: ["/"] }],
        sitemap: base ? [`${base}/sitemap.xml`] : undefined,
      };
    }

    return {
      rules: [
        {
          userAgent: "*",
          allow: allowLines.length ? allowLines : undefined,
          disallow: disallowLines.length ? disallowLines : undefined,
        },
      ],
      sitemap: base ? [`${base}/sitemap.xml`] : undefined,
      host: base,
    };
  } catch {
    return {
      rules: [{ userAgent: "*" }],
    };
  }
}