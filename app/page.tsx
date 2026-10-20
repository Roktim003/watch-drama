import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  // No title here → the root layout's default title is used.
  description:
    "Trending Turkish drama, K-Drama, C-Drama, anime, action movies and hot short dramas in HD — browse the rows, check what's coming soon, and pick up where you left off.",
  openGraph: {
    title: "WatchDrama — Watch Movies, Series & Dramas Online",
    description:
      "Trending Turkish drama, K-Drama, C-Drama, anime, movies and short dramas in HD.",
    url: "/",
  },
};

export const instant = false; // store-driven page: render per request
import { connection } from "next/server";
import {
  firstEpisodeNumber,
  titlesIn,
  type Title,
} from "@/lib/catalog";
import { getTitles } from "@/lib/store";
import PosterArt from "@/components/PosterArt";
import Row from "@/components/Row";
import TitleCard from "@/components/TitleCard";
import ContinueWatching from "@/components/ContinueWatching";

function Hero({ title }: { title: Title }) {
  const ep = firstEpisodeNumber(title);
  return (
    <section className="relative">
      <PosterArt title={title} wide className="h-[420px] w-full sm:h-[480px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-black/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
          <p className="mb-2 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded bg-red-600 px-2 py-1 text-white">Featured</span>
            <span className="rounded bg-black/60 px-2 py-1 text-white">{title.language}</span>
            {title.limitedFree && (
              <span className="rounded bg-amber-400 px-2 py-1 text-black">Limited Free</span>
            )}
          </p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight text-white drop-shadow sm:text-5xl">
            {title.name}
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-300">
            {title.year} · ★ {title.rating.toFixed(1)} · {title.genres.join(" · ")} ·{" "}
            {title.type === "movie" ? "Movie" : title.type === "short" ? "Short Drama" : "Series"}
          </p>
          <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-200 sm:text-base">
            {title.synopsis}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {ep !== undefined && (
              <Link
                href={`/watch/${title.slug}/${ep}`}
                className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500"
              >
                ▶ Watch Now
              </Link>
            )}
            <Link
              href={`/title/${title.slug}`}
              className="rounded-lg bg-white/15 px-6 py-3 font-bold text-white backdrop-blur transition hover:bg-white/25"
            >
              More Info
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  await connection(); // catalogue comes from the JSON store — render per request
  const TITLES = await getTitles();

  const ROWS: Array<{ title: string; href: string; items: Title[] }> = [
    {
      title: "Trending Now",
      href: "/browse/series",
      items: TITLES.filter((t) => t.trending),
    },
    { title: "Turkish Drama", href: "/browse/turkish-drama", items: titlesIn(TITLES, "turkish-drama").filter((t) => !t.comingSoon) },
    { title: "K-Drama", href: "/browse/k-drama", items: titlesIn(TITLES, "k-drama").filter((t) => !t.comingSoon) },
    { title: "C-Drama", href: "/browse/c-drama", items: titlesIn(TITLES, "c-drama") },
    { title: "Anime", href: "/browse/anime", items: titlesIn(TITLES, "anime").filter((t) => !t.comingSoon) },
    { title: "Action Movies", href: "/browse/action-movies", items: titlesIn(TITLES, "action-movies") },
    { title: "🔥 Hot Short TV", href: "/browse/hot-short-tv", items: titlesIn(TITLES, "hot-short-tv").filter((t) => !t.comingSoon) },
    { title: "Romance", href: "/browse/romance", items: titlesIn(TITLES, "romance").filter((t) => !t.comingSoon) },
    { title: "Coming Soon", href: "/browse/coming-soon", items: titlesIn(TITLES, "coming-soon") },
  ];

  const featured = TITLES.find((t) => t.featured) ?? TITLES[0];
  return (
    <div className="pb-14">
      {featured && <Hero title={featured} />}
      <div className="mt-8 flex flex-col gap-9">
        <ContinueWatching />
        {ROWS.filter((r) => r.items.length > 0).map((row) => (
          <Row key={row.title} title={row.title} href={row.href}>
            {row.items.map((t) => (
              <TitleCard key={t.slug} title={t} />
            ))}
          </Row>
        ))}
      </div>
    </div>
  );
}
