import { NextResponse, connection } from "next/server";
import { getTitles } from "@/lib/store";

/**
 * Public, read-only slim catalogue for client components (header search,
 * Continue Watching). Only display fields — no episode/source data.
 */
export async function GET() {
  await connection();
  const titles = await getTitles();
  const slim = titles.map((t) => ({
    slug: t.slug,
    name: t.name,
    type: t.type,
    year: t.year,
    rating: t.rating,
    language: t.language,
    genres: t.genres,
    categories: t.categories,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    comingSoon: t.comingSoon ?? false,
  }));
  return NextResponse.json({ titles: slim });
}
