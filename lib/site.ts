// WatchDrama — public site URL (Phase 4).
//
// Used for absolute URLs in metadata (Open Graph), robots.txt and the
// sitemap. Set NEXT_PUBLIC_SITE_URL to the real domain before go-live
// (e.g. https://watchdrama.example.com). Falls back to localhost so local
// development keeps working without any configuration.

export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const url = raw && raw.length > 0 ? raw : "http://localhost:3000";
  return url.replace(/\/+$/, "");
}
