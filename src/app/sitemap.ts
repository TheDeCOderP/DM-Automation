import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const config = await prisma.siteConfig.findFirst();
    const domain = config?.domain?.replace(/\/$/, "");
    const base = domain?.startsWith("http") ? domain : domain ? `https://${domain}` : undefined;

    if (!config || config.sitemapEnabled === false || !base) {
      return [];
    }

    const urls: MetadataRoute.Sitemap = [];

    // Home
    urls.push({ url: `${base}/`, changeFrequency: "weekly", priority: 1.0 });

    // Add static key pages if any (examples)
    const staticPaths = ["/login", "/register"];
    for (const p of staticPaths) {
      urls.push({ url: `${base}${p}`, changeFrequency: "monthly", priority: 0.3 });
    }

    // Extra URLs from config
    const extra = Array.isArray(config.sitemapExtraUrls) ? config.sitemapExtraUrls : [];
    for (const u of extra) {
      if (typeof u === "string" && u.startsWith("http")) {
        urls.push({ url: u, changeFrequency: "monthly", priority: 0.5 });
      }
    }

    return urls;
  } catch {
    return [];
  }
}