// WatchDrama — robots.txt (Phase 4).
// Public pages may be crawled; the admin panel and all API routes are
// disallowed. The sitemap URL is absolute, built from NEXT_PUBLIC_SITE_URL.

import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
