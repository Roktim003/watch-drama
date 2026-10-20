// WatchDrama — dynamic sitemap.xml (Phase 4).
//
// Built per request from the live catalogue store, so titles added in
// /admin appear in the sitemap without a rebuild or redeploy.

import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { CATEGORIES } from "@/lib/catalog";
import { getTitles } from "@/lib/store";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // render per request — catalogue comes from the store
  const base = siteUrl();
  const now = new Date();
  const titles = await getTitles();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...CATEGORIES.map((c) => ({
      url: `${base}/browse/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...titles.map((t) => ({
      url: `${base}/title/${t.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
