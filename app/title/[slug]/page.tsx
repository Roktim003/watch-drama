import Link from "next/link";

export const instant = false;
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { firstEpisodeNumber, getTitle, suggestedTitles } from "@/lib/catalog";
import { getTitle as getStoredTitle, getTitles } from "@/lib/store";
import PosterArt from "@/components/PosterArt";
import Row from "@/components/Row";
import TitleCard from "@/components/TitleCard";
import BookButton from "@/components/BookButton";
import WatchlistButton from "@/components/WatchlistButton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = await getStoredTitle(slug);
  return { title: title ? `${title.name} — WatchDrama` : "Title — WatchDrama" };
}

export default async function TitlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await headers(); // fully dynamic route → missing titles return a real 404
  const { slug } = await params;
  const all = await getTitles();
  const title = getTitle(all, slug);
  if (!title) notFound();

  const firstEp = firstEpisodeNumber(title);
  const suggested = suggestedTitles(all, title);

  return (
    <div className="pb-14">
      {/* Backdrop */}
      <section className="relative">
        <PosterArt title={title} wide className="h-[300px] w-full sm:h-[360px]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d12] via-black/40 to-transparent" />
      </section>

      <div className="mx-auto -mt-24 w-full max-w-7xl px-4 sm:px-6">
        <div className="relative flex flex-col gap-6 sm:flex-row">
          <div className="w-40 shrink-0 sm:w-52">
            <PosterArt
              title={title}
              className="aspect-[2/3] w-full rounded-xl ring-1 ring-white/20"
            />
          </div>
          <div className="pt-2 sm:pt-28">
            <h1 className="text-3xl font-black text-white sm:text-4xl">{title.name}</h1>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-300">
              <span>{title.year}</span>
              {!title.comingSoon && <span>★ {title.rating.toFixed(1)} / 10</span>}
              <span>{title.language}</span>
              <span className="capitalize">
                {title.type === "short" ? "Short Drama" : title.type}
              </span>
              <span>{title.genres.join(" · ")}</span>
              {title.duration && <span>{title.duration}</span>}
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-zinc-300">{title.synopsis}</p>
            <p className="mt-3 text-sm text-zinc-500">
              <span className="font-semibold text-zinc-400">Cast:</span> {title.cast.join(", ")}{" "}
              <span className="text-zinc-600">(placeholder)</span>
            </p>
            <div className="mt-5 flex flex-wrap items-start gap-3">
              {firstEp !== undefined ? (
                <>
                  <Link
                    href={`/watch/${title.slug}/${firstEp}`}
                    className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500"
                  >
                    ▶ Watch Episode {firstEp}
                  </Link>
                  <WatchlistButton slug={title.slug} />
                </>
              ) : (
                <div className="w-56">
                  <span className="block rounded-lg bg-white/10 px-5 py-3 text-center font-bold text-white">
                    Coming {title.releaseDate ?? "Soon"}
                  </span>
                  <BookButton slug={title.slug} baseCount={title.bookedCount ?? 0} />
                  <div className="mt-2 [&>button]:w-full">
                    <WatchlistButton slug={title.slug} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Episodes */}
        {title.seasons.length > 0 && (
          <section className="mt-12">
            {title.seasons.map((season) => (
              <div key={season.number} className="mb-8">
                <h2 className="mb-3 text-xl font-bold text-white">Season {season.number}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {season.episodes.map((ep) => (
                    <Link
                      key={ep.number}
                      href={`/watch/${title.slug}/${ep.number}`}
                      className="group flex items-center gap-4 rounded-xl bg-zinc-900/70 p-3 ring-1 ring-white/10 hover:ring-red-500/60"
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-600/15 text-lg font-black text-red-400 group-hover:bg-red-600 group-hover:text-white">
                        {ep.number}
                      </span>
                      <span>
                        <span className="block font-semibold text-white">{ep.name}</span>
                        <span className="block text-xs text-zinc-400">
                          {ep.duration ?? ""} · {ep.sources.length} servers ·{" "}
                          {ep.subtitles.length > 0 ? "Subtitles" : "No subtitles"}
                        </span>
                      </span>
                      <span className="ml-auto text-zinc-500 group-hover:text-white">▶</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Suggested */}
        {suggested.length > 0 && (
          <div className="mt-6">
            <Row title="You May Also Like">
              {suggested.map((t) => (
                <TitleCard key={t.slug} title={t} />
              ))}
            </Row>
          </div>
        )}
      </div>
    </div>
  );
}
