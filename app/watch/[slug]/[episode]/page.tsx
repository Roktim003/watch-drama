import Link from "next/link";

export const instant = false;
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { findEpisode } from "@/lib/catalog";
import { getTitle } from "@/lib/store";
import Player from "@/components/Player";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>;
}) {
  const { slug, episode } = await params;
  const title = await getTitle(slug);
  if (!title) return { title: "Watch" };
  return {
    title: `Watch ${title.name} Episode ${episode}`,
    description: `Watch ${title.name} Episode ${episode} online in HD with subtitles on WatchDrama.`,
    openGraph: {
      title: `Watch ${title.name} Episode ${episode} — WatchDrama`,
      description: title.synopsis,
      url: `/watch/${title.slug}/${episode}`,
      type: "video.episode",
    },
  };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string; episode: string }>;
}) {
  await headers(); // fully dynamic route → missing titles return a real 404
  const { slug, episode: episodeParam } = await params;
  const title = await getTitle(slug);
  if (!title) notFound();
  const episodeNumber = Number.parseInt(episodeParam, 10);
  if (Number.isNaN(episodeNumber)) notFound();
  const found = findEpisode(title, episodeNumber);
  if (!found) notFound();
  const { episode } = found;

  const allEpisodes = title.seasons.flatMap((s) => s.episodes);
  const prev = allEpisodes.filter((e) => e.number < episodeNumber).pop();
  const next = allEpisodes.find((e) => e.number > episodeNumber);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <nav className="mb-4 text-sm text-zinc-400">
        <Link href="/" className="hover:text-white">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href={`/title/${title.slug}`} className="hover:text-white">
          {title.name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-200">Episode {episode.number}</span>
      </nav>

      <h1 className="mb-4 text-xl font-bold text-white sm:text-2xl">
        {title.name} — <span className="text-red-400">{episode.name}</span>
      </h1>

      <Player slug={title.slug} titleName={title.name} episode={episode} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {prev && (
          <Link
            href={`/watch/${title.slug}/${prev.number}`}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            ← Episode {prev.number}
          </Link>
        )}
        {next && (
          <Link
            href={`/watch/${title.slug}/${next.number}`}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            Episode {next.number} →
          </Link>
        )}
        <Link
          href={`/title/${title.slug}`}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          All Episodes
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-bold text-white">Episodes</h2>
        <div className="flex flex-wrap gap-2">
          {allEpisodes.map((e) => (
            <Link
              key={e.number}
              href={`/watch/${title.slug}/${e.number}`}
              className={`rounded-md px-3.5 py-2 text-sm font-semibold ${
                e.number === episodeNumber
                  ? "bg-red-600 text-white"
                  : "bg-white/10 text-zinc-200 hover:bg-white/20"
              }`}
            >
              {e.number}
            </Link>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-zinc-400">
          {title.synopsis}
        </p>
      </section>
    </div>
  );
}
