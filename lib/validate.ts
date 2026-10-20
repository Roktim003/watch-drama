// Server-side validation + normalization for catalogue titles (Phase 2).
// Used by the admin API routes (create / update / import). Returns plain,
// human-readable error strings the admin UI shows as-is.

import {
  CATEGORIES,
  type Episode,
  type Season,
  type SubtitleTrack,
  type Title,
  type TitleType,
  type VideoSource,
} from "./catalog";

const TITLE_TYPES: TitleType[] = ["movie", "series", "short"];
const CATEGORY_SLUGS = new Set(CATEGORIES.map((c) => c.slug));
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isHttpUrl(v: unknown): v is string {
  return typeof v === "string" && /^https?:\/\//i.test(v.trim());
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown, fallback: number): number {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

export interface ValidationResult {
  title?: Title;
  errors: string[];
}

/**
 * Validate one raw title object. `existingSlugs` is the set of slugs already
 * in the catalogue; `selfSlug` (on update) is excluded from the unique check.
 */
export function validateTitle(
  raw: unknown,
  existingSlugs: Set<string>,
  selfSlug?: string
): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") {
    return { errors: ["Title must be an object"] };
  }
  const r = raw as Record<string, unknown>;

  const name = str(r.name);
  if (!name) errors.push("Name is required");

  const slug = str(r.slug);
  if (!slug) errors.push("Slug is required");
  else if (!SLUG_RE.test(slug))
    errors.push("Slug may only contain lowercase letters, numbers and hyphens");
  else if (slug !== selfSlug && existingSlugs.has(slug))
    errors.push(`A title with slug "${slug}" already exists`);

  const type = r.type as TitleType;
  if (!TITLE_TYPES.includes(type)) errors.push('Type must be "movie", "series" or "short"');

  const year = num(r.year, NaN);
  if (!Number.isFinite(year) || year < 1900 || year > 2100)
    errors.push("Year must be a number between 1900 and 2100");

  const rating = num(r.rating, 0);
  if (rating < 0 || rating > 10) errors.push("Rating must be between 0 and 10");

  const categories = Array.isArray(r.categories)
    ? r.categories.map((c) => str(c)).filter(Boolean)
    : [];
  for (const c of categories) {
    if (!CATEGORY_SLUGS.has(c)) errors.push(`Unknown category "${c}"`);
  }

  const comingSoon = r.comingSoon === true;

  // Seasons / episodes / sources / subtitles
  const seasonsIn = Array.isArray(r.seasons) ? r.seasons : [];
  const seasons: Season[] = [];
  seasonsIn.forEach((sRaw, si) => {
    const s = (sRaw ?? {}) as Record<string, unknown>;
    const sNum = num(s.number, si + 1);
    const epsIn = Array.isArray(s.episodes) ? s.episodes : [];
    const episodes: Episode[] = [];
    epsIn.forEach((eRaw, ei) => {
      const e = (eRaw ?? {}) as Record<string, unknown>;
      const label = `Season ${sNum}, episode ${ei + 1}`;
      const sourcesIn = Array.isArray(e.sources) ? e.sources : [];
      const sources: VideoSource[] = [];
      sourcesIn.forEach((srcRaw, srcI) => {
        const src = (srcRaw ?? {}) as Record<string, unknown>;
        const url = str(src.url);
        if (!url) {
          errors.push(`${label}: source ${srcI + 1} URL is required`);
          return;
        }
        if (!isHttpUrl(url))
          errors.push(`${label}: source ${srcI + 1} URL must start with http:// or https://`);
        const st = src.type === "mp4" ? "mp4" : "hls";
        if (src.type !== "hls" && src.type !== "mp4")
          errors.push(`${label}: source ${srcI + 1} type must be "hls" or "mp4"`);
        sources.push({ name: str(src.name) || `Server ${srcI + 1}`, url, type: st });
      });
      if (!comingSoon && sourcesIn.length === 0)
        errors.push(`${label}: add at least one video source`);
      const subsIn = Array.isArray(e.subtitles) ? e.subtitles : [];
      const subtitles: SubtitleTrack[] = [];
      subsIn.forEach((subRaw, subI) => {
        const sub = (subRaw ?? {}) as Record<string, unknown>;
        const url = str(sub.url);
        if (!url) {
          errors.push(`${label}: subtitle ${subI + 1} URL is required`);
          return;
        }
        if (!/^https?:\/\//i.test(url) && !url.startsWith("/"))
          errors.push(`${label}: subtitle ${subI + 1} URL must start with http(s):// or /`);
        subtitles.push({ lang: str(sub.lang) || "English", url });
      });
      episodes.push({
        number: num(e.number, ei + 1),
        name: str(e.name) || `Episode ${ei + 1}`,
        duration: str(e.duration) || undefined,
        sources,
        subtitles,
      });
    });
    seasons.push({ number: sNum, episodes });
  });

  if (errors.length > 0) return { errors };

  const title: Title = {
    slug,
    name,
    type,
    year,
    rating,
    language: str(r.language) || "English",
    duration: str(r.duration) || undefined,
    posterUrl: str(r.posterUrl) || undefined,
    backdropUrl: str(r.backdropUrl) || undefined,
    categories,
    genres: Array.isArray(r.genres)
      ? r.genres.map((g) => str(g)).filter(Boolean)
      : str(r.genres as string)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
    synopsis: str(r.synopsis),
    cast: Array.isArray(r.cast)
      ? r.cast.map((c) => str(c)).filter(Boolean)
      : str(r.cast as string)
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
    featured: r.featured === true,
    trending: r.trending === true,
    limitedFree: r.limitedFree === true,
    comingSoon,
    releaseDate: str(r.releaseDate) || undefined,
    bookedCount: comingSoon ? Math.max(0, Math.round(num(r.bookedCount, 0))) : undefined,
    seasons,
  };
  return { title, errors: [] };
}

/** Validate a full catalogue import (array or { titles: [...] }). */
export function validateCatalogue(raw: unknown): { titles?: Title[]; errors: string[] } {
  const list = Array.isArray(raw) ? raw : (raw as { titles?: unknown })?.titles;
  if (!Array.isArray(list)) {
    return { errors: ["Import file must be a JSON array of titles, or an object with a \"titles\" array"] };
  }
  const seen = new Set<string>();
  const titles: Title[] = [];
  const errors: string[] = [];
  list.forEach((item, i) => {
    const res = validateTitle(item, seen);
    if (res.errors.length > 0) {
      errors.push(...res.errors.map((e) => `Title #${i + 1}: ${e}`));
    } else if (res.title) {
      seen.add(res.title.slug);
      titles.push(res.title);
    }
  });
  if (errors.length > 0) return { errors: errors.slice(0, 25) };
  return { titles, errors: [] };
}
