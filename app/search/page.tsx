import { Suspense } from "react";
import Link from "next/link";
import { searchTitles } from "@/lib/catalog";
import TitleCard from "@/components/TitleCard";

export const metadata = { title: "Search — WatchDrama" };

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 text-zinc-400">Loading search…</div>}>
      <SearchResults searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = searchTitles(q);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white">Search</h1>
      <form action="/search" className="mt-4 flex max-w-xl overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/15">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search movies, dramas, anime…"
          className="w-full bg-transparent px-4 py-3 text-white outline-none placeholder:text-zinc-500"
        />
        <button type="submit" className="shrink-0 bg-red-600 px-5 font-semibold text-white">
          Search
        </button>
      </form>

      {q.trim() ? (
        <>
          <p className="mt-6 text-sm text-zinc-400">
            {results.length} result{results.length === 1 ? "" : "s"} for “{q}”
          </p>
          {results.length === 0 ? (
            <p className="mt-8 text-zinc-400">
              Nothing matched. Try a title, genre (“romance”), or language (“turkish”).{" "}
              <Link href="/" className="text-red-400 underline">
                Back to home
              </Link>
            </p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-4">
              {results.map((t) => (
                <TitleCard key={t.slug} title={t} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-6 text-zinc-400">Type something above to search the catalogue.</p>
      )}
    </div>
  );
}
