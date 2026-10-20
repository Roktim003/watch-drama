import { NextResponse, connection } from "next/server";
import { getTitles } from "@/lib/store";

/**
 * Public, read-only slug index for proxy.ts (Phase 4B).
 *
 * In Postgres mode (DATABASE_URL set) the proxy can't read the catalogue
 * file synchronously, so it fetches this route instead: every title slug
 * with its episode numbers — exactly the data the proxy's real-404 check
 * needs, nothing more (no synopses, no sources, no user data).
 */
export async function GET() {
  await connection();
  const titles = await getTitles();
  const slugs = titles.map((t) => ({
    slug: t.slug,
    episodes: (t.seasons ?? []).flatMap((s) => (s.episodes ?? []).map((e) => e.number)),
  }));
  return NextResponse.json({ slugs });
}
