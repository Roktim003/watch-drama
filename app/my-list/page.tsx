import Link from "next/link";

export const instant = false;
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/userAuth";
import { getTitles } from "@/lib/store";
import type { Title } from "@/lib/catalog";
import PosterArt from "@/components/PosterArt";
import TitleCard from "@/components/TitleCard";
import { ClearProgressButton, RemoveSlugButton } from "@/components/MyListActions";

export const metadata = {
  title: "My List",
  description: "Your WatchDrama watchlist, bookings and continue-watching progress, synced with your account.",
};

export default async function MyListPage() {
  await headers(); // fully dynamic → per-request auth check
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/my-list");

  const titles = await getTitles();
  const bySlug = new Map(titles.map((t) => [t.slug, t]));
  const watchlistTitles = user.watchlist
    .map((s) => bySlug.get(s))
    .filter((t): t is Title => !!t);
  const bookingTitles = user.bookings
    .map((s) => bySlug.get(s))
    .filter((t): t is Title => !!t);
  const progressEntries = Object.entries(user.progress)
    .filter(([slug]) => bySlug.has(slug))
    .sort((a, b) => (Date.parse(b[1].updatedAt) || 0) - (Date.parse(a[1].updatedAt) || 0));

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-black text-white sm:text-3xl">
        My List
      </h1>
      <p className="mt-1 text-sm text-zinc-400">
        Signed in as <span className="font-semibold text-zinc-200">{user.name}</span> ({user.email}).
        Your list, bookings and progress sync with your account.
      </p>

      {/* Continue Watching / History */}
      <section id="history" className="mt-10 scroll-mt-20">
        <h2 className="mb-3 text-lg font-bold text-white">Continue Watching</h2>
        {progressEntries.length === 0 ? (
          <p className="rounded-xl bg-zinc-900/70 px-4 py-5 text-sm text-zinc-400 ring-1 ring-white/10">
            Nothing in progress yet — start watching and your progress will
            appear here on every device.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {progressEntries.map(([slug, p]) => {
              const title = bySlug.get(slug)!;
              const pct =
                p.duration > 0
                  ? Math.min(100, Math.round((p.position / p.duration) * 100))
                  : 0;
              return (
                <div
                  key={slug}
                  className="rounded-xl bg-zinc-900/70 p-3 ring-1 ring-white/10"
                >
                  <Link href={`/watch/${slug}/${p.episode}`} className="group block">
                    <div className="relative overflow-hidden rounded-lg">
                      <PosterArt title={title} wide className="aspect-video w-full" />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg text-white ring-1 ring-white/40">
                          ▶
                        </span>
                      </span>
                      <span
                        className="absolute bottom-0 left-0 h-1 bg-red-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 truncate font-semibold text-white group-hover:text-red-400">
                      {title.name}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Episode {p.episode} · {pct}% watched ·{" "}
                      {new Date(p.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/watch/${slug}/${p.episode}`}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Resume
                    </Link>
                    <ClearProgressButton slug={slug} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Watchlist */}
      <section className="mt-12">
        <h2 className="mb-3 text-lg font-bold text-white">Watchlist</h2>
        {watchlistTitles.length === 0 ? (
          <p className="rounded-xl bg-zinc-900/70 px-4 py-5 text-sm text-zinc-400 ring-1 ring-white/10">
            Your watchlist is empty. Tap <b className="text-zinc-200">＋ My List</b> on
            any title to save it here.{" "}
            <Link href="/" className="font-semibold text-red-400 hover:text-red-300">
              Browse titles →
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {watchlistTitles.map((t) => (
              <div key={t.slug}>
                <TitleCard title={t} />
                <div className="mt-2">
                  <RemoveSlugButton endpoint="watchlist" slug={t.slug} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bookings */}
      <section className="mt-12 pb-6">
        <h2 className="mb-3 text-lg font-bold text-white">My Bookings</h2>
        {bookingTitles.length === 0 ? (
          <p className="rounded-xl bg-zinc-900/70 px-4 py-5 text-sm text-zinc-400 ring-1 ring-white/10">
            No bookings yet.{" "}
            <Link href="/browse/coming-soon" className="font-semibold text-red-400 hover:text-red-300">
              Browse coming soon →
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {bookingTitles.map((t) => (
              <div key={t.slug}>
                <TitleCard title={t} />
                <div className="mt-2">
                  <RemoveSlugButton endpoint="bookings" slug={t.slug} label="Cancel booking" />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
