"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Title } from "@/lib/catalog";
import PosterArt from "@/components/PosterArt";

export default function TitlesTable({ titles }: { titles: Title[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return titles;
    return titles.filter(
      (t) =>
        t.name.toLowerCase().includes(needle) ||
        t.slug.includes(needle) ||
        t.categories.some((c) => c.includes(needle))
    );
  }, [titles, q]);

  async function onDelete(t: Title) {
    if (
      !window.confirm(
        `Delete "${t.name}"? This removes the title and all its episodes from the site.`
      )
    )
      return;
    setBusy(t.slug);
    const res = await fetch(`/api/admin/titles/${encodeURIComponent(t.slug)}`, {
      method: "DELETE",
    });
    setBusy("");
    if (res.ok) router.refresh();
    else {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error ?? "Delete failed");
    }
  }

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter titles…"
        className="mb-4 w-full max-w-sm rounded-md bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-500 focus:ring-red-500"
      />
      <div className="overflow-x-auto rounded-xl ring-1 ring-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3">Episodes</th>
              <th className="px-4 py-3">Flags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const eps = t.seasons.reduce((n, s) => n + s.episodes.length, 0);
              return (
                <tr key={t.slug} className="border-t border-white/5 bg-zinc-950/40 hover:bg-zinc-900/60">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      {t.posterUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.posterUrl} alt="" className="h-12 w-9 rounded object-cover" />
                      ) : (
                        <PosterArt title={t} className="h-12 w-9 shrink-0 rounded" />
                      )}
                      <span>
                        <span className="block font-semibold text-white">{t.name}</span>
                        <span className="block text-xs text-zinc-500">/{t.slug} · {t.year}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 capitalize text-zinc-300">{t.type}</td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">
                    {t.categories.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">{eps}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex flex-wrap gap-1">
                      {t.featured && (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Featured</span>
                      )}
                      {t.comingSoon && (
                        <span className="rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">Coming soon</span>
                      )}
                      {t.trending && (
                        <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-semibold text-white">Trending</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-2 text-xs font-semibold">
                      <Link
                        href={`/title/${t.slug}`}
                        target="_blank"
                        className="rounded-md bg-white/10 px-2.5 py-1.5 text-white hover:bg-white/20"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/titles/${t.slug}/edit`}
                        className="rounded-md bg-red-600 px-2.5 py-1.5 text-white hover:bg-red-500"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => onDelete(t)}
                        disabled={busy === t.slug}
                        className="rounded-md bg-white/10 px-2.5 py-1.5 text-red-300 hover:bg-red-950 disabled:opacity-50"
                      >
                        {busy === t.slug ? "…" : "Delete"}
                      </button>
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No titles match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
