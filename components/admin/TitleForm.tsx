"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CATEGORIES,
  type Episode,
  type Season,
  type Title,
  type TitleType,
} from "@/lib/catalog";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function blankEpisode(n: number): Episode {
  return {
    number: n,
    name: `Episode ${n}`,
    duration: "",
    sources: [{ name: "Server 1", url: "", type: "hls" }],
    subtitles: [],
  };
}

function blankTitle(): Title {
  return {
    slug: "",
    name: "",
    type: "series",
    year: new Date().getFullYear(),
    rating: 0,
    language: "Turkish",
    duration: "",
    posterUrl: "",
    backdropUrl: "",
    categories: [],
    genres: [],
    synopsis: "",
    cast: [],
    featured: false,
    trending: false,
    limitedFree: false,
    comingSoon: false,
    releaseDate: "",
    bookedCount: 0,
    seasons: [{ number: 1, episodes: [blankEpisode(1)] }],
  };
}

const inputCls =
  "w-full rounded-md bg-zinc-800 px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-zinc-500 focus:ring-red-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-zinc-400";

export default function TitleForm({ initial }: { initial: Title | null }) {
  const router = useRouter();
  const [form, setForm] = useState<Title>(() =>
    initial ? (JSON.parse(JSON.stringify(initial)) as Title) : blankTitle()
  );
  const [genresText, setGenresText] = useState((initial?.genres ?? []).join(", "));
  const [castText, setCastText] = useState((initial?.cast ?? []).join(", "));
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Title>(key: K, value: Title[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function mutateSeasons(fn: (seasons: Season[]) => void) {
    setForm((f) => {
      const seasons: Season[] = JSON.parse(JSON.stringify(f.seasons));
      fn(seasons);
      return { ...f, seasons };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload: Title = {
      ...form,
      genres: genresText.split(",").map((s) => s.trim()).filter(Boolean),
      cast: castText.split(",").map((s) => s.trim()).filter(Boolean),
      year: Number(form.year) || 0,
      rating: Number(form.rating) || 0,
      bookedCount: Number(form.bookedCount) || 0,
    };
    try {
      const res = await fetch(
        initial ? `/api/admin/titles/${encodeURIComponent(initial.slug)}` : "/api/admin/titles",
        {
          method: initial ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
      router.push("/admin/titles");
      router.refresh();
    } catch {
      setError("Network error while saving");
      setSaving(false);
    }
  }

  function toggleCategory(slug: string, on: boolean) {
    set(
      "categories",
      on ? [...form.categories, slug] : form.categories.filter((c) => c !== slug)
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200 ring-1 ring-red-500/40">
          {error}
        </div>
      )}

      {/* ── Basic info ─────────────────────────────────────────── */}
      <section className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10">
        <h2 className="mb-4 text-base font-bold text-white">Basic info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Name *</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => {
                const name = e.target.value;
                set("name", name);
                if (!slugTouched) set("slug", slugify(name));
              }}
              placeholder="e.g. Bound by Fate (Arafta)"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Slug (URL) *</label>
            <input
              className={inputCls}
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value);
              }}
              placeholder="bound-by-fate-arafta"
              required
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => set("type", e.target.value as TitleType)}
            >
              <option value="series">Series</option>
              <option value="movie">Movie</option>
              <option value="short">Short drama</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Year</label>
            <input
              className={inputCls}
              type="number"
              value={form.year}
              onChange={(e) => set("year", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Rating (0–10)</label>
            <input
              className={inputCls}
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={form.rating}
              onChange={(e) => set("rating", Number(e.target.value))}
            />
          </div>
          <div>
            <label className={labelCls}>Language (poster badge)</label>
            <input
              className={inputCls}
              value={form.language}
              onChange={(e) => set("language", e.target.value)}
              placeholder="Turkish"
            />
          </div>
          <div>
            <label className={labelCls}>Duration label (optional)</label>
            <input
              className={inputCls}
              value={form.duration ?? ""}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="45 min/ep or 1h 52m"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Synopsis</label>
            <textarea
              className={inputCls}
              rows={4}
              value={form.synopsis}
              onChange={(e) => set("synopsis", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Cast (comma separated)</label>
            <input
              className={inputCls}
              value={castText}
              onChange={(e) => setCastText(e.target.value)}
              placeholder="Actor One, Actor Two"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Genres (comma separated)</label>
            <input
              className={inputCls}
              value={genresText}
              onChange={(e) => setGenresText(e.target.value)}
              placeholder="Drama, Romance"
            />
          </div>
          <div>
            <label className={labelCls}>Poster image URL (optional)</label>
            <input
              className={inputCls}
              value={form.posterUrl ?? ""}
              onChange={(e) => set("posterUrl", e.target.value)}
              placeholder="https://… (blank = generated art)"
            />
          </div>
          <div>
            <label className={labelCls}>Backdrop image URL (optional)</label>
            <input
              className={inputCls}
              value={form.backdropUrl ?? ""}
              onChange={(e) => set("backdropUrl", e.target.value)}
              placeholder="https://… (blank = generated art)"
            />
          </div>
        </div>

        <div className="mt-5">
          <p className={labelCls}>Categories — where this title appears</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.slug !== "movies" && c.slug !== "series").map((c) => {
              const on = form.categories.includes(c.slug);
              return (
                <label
                  key={c.slug}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                    on
                      ? "bg-red-600 text-white ring-red-500"
                      : "bg-zinc-800 text-zinc-300 ring-white/10 hover:bg-zinc-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={(e) => toggleCategory(c.slug, e.target.checked)}
                  />
                  {c.title}
                </label>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            Movies / Series pages are automatic, based on the Type above.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-5 text-sm text-zinc-200">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Featured (homepage hero)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.trending}
              onChange={(e) => set("trending", e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Trending
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.limitedFree}
              onChange={(e) => set("limitedFree", e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Limited Free badge
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!form.comingSoon}
              onChange={(e) => set("comingSoon", e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            Coming Soon
          </label>
        </div>
        {form.comingSoon && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Release date label</label>
              <input
                className={inputCls}
                value={form.releaseDate ?? ""}
                onChange={(e) => set("releaseDate", e.target.value)}
                placeholder="Nov 4"
              />
            </div>
            <div>
              <label className={labelCls}>Booked count (starting number)</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                value={form.bookedCount ?? 0}
                onChange={(e) => set("bookedCount", Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </section>

      {/* ── Seasons & episodes ─────────────────────────────────── */}
      <section className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Seasons &amp; episodes</h2>
          <button
            type="button"
            onClick={() =>
              mutateSeasons((ss) => {
                ss.push({ number: ss.length + 1, episodes: [blankEpisode(1)] });
              })
            }
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
          >
            + Add season
          </button>
        </div>

        {form.seasons.map((season, si) => (
          <div key={si} className="mb-5 rounded-lg bg-zinc-950/60 p-4 ring-1 ring-white/10">
            <div className="mb-3 flex items-center gap-3">
              <span className="text-sm font-bold text-white">Season</span>
              <input
                type="number"
                className="w-20 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                value={season.number}
                onChange={(e) =>
                  mutateSeasons((ss) => {
                    ss[si].number = Number(e.target.value);
                  })
                }
              />
              {form.seasons.length > 1 && (
                <button
                  type="button"
                  onClick={() => mutateSeasons((ss) => void ss.splice(si, 1))}
                  className="ml-auto text-xs font-semibold text-red-400 hover:text-red-300"
                >
                  Remove season
                </button>
              )}
            </div>

            {season.episodes.map((ep, ei) => (
              <div key={ei} className="mb-3 rounded-lg bg-zinc-900 p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase text-zinc-400">Ep</span>
                  <input
                    type="number"
                    className="w-16 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                    value={ep.number}
                    onChange={(e) =>
                      mutateSeasons((ss) => {
                        ss[si].episodes[ei].number = Number(e.target.value);
                      })
                    }
                  />
                  <input
                    className="min-w-40 flex-1 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                    value={ep.name}
                    onChange={(e) =>
                      mutateSeasons((ss) => {
                        ss[si].episodes[ei].name = e.target.value;
                      })
                    }
                    placeholder="Episode name"
                  />
                  <input
                    className="w-24 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                    value={ep.duration ?? ""}
                    onChange={(e) =>
                      mutateSeasons((ss) => {
                        ss[si].episodes[ei].duration = e.target.value;
                      })
                    }
                    placeholder="42 min"
                  />
                  <button
                    type="button"
                    onClick={() => mutateSeasons((ss) => void ss[si].episodes.splice(ei, 1))}
                    className="text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    Remove episode
                  </button>
                </div>

                {/* Sources */}
                <div className="mt-3 flex flex-col gap-2">
                  {ep.sources.map((src, ri) => (
                    <div key={ri} className="flex flex-wrap items-center gap-2">
                      <span className="w-16 text-xs text-zinc-500">Source</span>
                      <input
                        className="w-32 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                        value={src.name}
                        onChange={(e) =>
                          mutateSeasons((ss) => {
                            ss[si].episodes[ei].sources[ri].name = e.target.value;
                          })
                        }
                        placeholder="Server 1"
                      />
                      <input
                        className="min-w-52 flex-1 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                        value={src.url}
                        onChange={(e) =>
                          mutateSeasons((ss) => {
                            ss[si].episodes[ei].sources[ri].url = e.target.value;
                          })
                        }
                        placeholder="https://your-host/episode1.m3u8"
                      />
                      <select
                        className="rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                        value={src.type}
                        onChange={(e) =>
                          mutateSeasons((ss) => {
                            ss[si].episodes[ei].sources[ri].type = e.target
                              .value as "hls" | "mp4";
                          })
                        }
                      >
                        <option value="hls">HLS (.m3u8)</option>
                        <option value="mp4">MP4</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          mutateSeasons((ss) => void ss[si].episodes[ei].sources.splice(ri, 1))
                        }
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      mutateSeasons((ss) => {
                        const list = ss[si].episodes[ei].sources;
                        list.push({ name: `Server ${list.length + 1}`, url: "", type: "hls" });
                      })
                    }
                    className="self-start text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    + Add source (another server for this episode)
                  </button>
                </div>

                {/* Subtitles */}
                <div className="mt-2 flex flex-col gap-2">
                  {ep.subtitles.map((sub, ri) => (
                    <div key={ri} className="flex flex-wrap items-center gap-2">
                      <span className="w-16 text-xs text-zinc-500">Subtitle</span>
                      <input
                        className="w-32 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                        value={sub.lang}
                        onChange={(e) =>
                          mutateSeasons((ss) => {
                            ss[si].episodes[ei].subtitles[ri].lang = e.target.value;
                          })
                        }
                        placeholder="English"
                      />
                      <input
                        className="min-w-52 flex-1 rounded-md bg-zinc-800 px-2 py-1.5 text-sm text-white ring-1 ring-white/10"
                        value={sub.url}
                        onChange={(e) =>
                          mutateSeasons((ss) => {
                            ss[si].episodes[ei].subtitles[ri].url = e.target.value;
                          })
                        }
                        placeholder="https://your-host/episode1-en.vtt"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          mutateSeasons((ss) => void ss[si].episodes[ei].subtitles.splice(ri, 1))
                        }
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      mutateSeasons((ss) => {
                        ss[si].episodes[ei].subtitles.push({ lang: "English", url: "" });
                      })
                    }
                    className="self-start text-xs font-semibold text-red-400 hover:text-red-300"
                  >
                    + Add subtitle (.vtt)
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                mutateSeasons((ss) => {
                  ss[si].episodes.push(blankEpisode(ss[si].episodes.length + 1));
                })
              }
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              + Add episode
            </button>
          </div>
        ))}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-red-600 px-6 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50"
        >
          {saving ? "Saving…" : initial ? "Save changes" : "Create title"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/titles")}
          className="rounded-lg bg-white/10 px-5 py-3 font-semibold text-white hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
