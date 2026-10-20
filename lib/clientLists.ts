// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — client-side list storage + account sync (Phase 3).
// Client components only (uses localStorage / fetch).
//
// Guests keep everything in localStorage, exactly like Phase 1:
//   wd-watchlist : string[]                    (title slugs) — new in Phase 3
//   wd-booked    : { [slug]: true }            (Phase 1 key, kept)
//   wd-continue  : ContinueItem[]              (Phase 1 key, kept)
//   wd-progress:<slug>:<episode>               (per-episode resume point)
//
// When a viewer is logged in, every change ALSO goes to the server
// (fire-and-forget — a failed/401 request never blocks the UI). Right
// after login/signup, mergeLocalIntoAccount() unions the guest data into
// the account and rewrites localStorage from the merged result, so the
// two stay in sync from then on.
// ─────────────────────────────────────────────────────────────────────────────

import type { ContinueItem } from "@/components/ContinueWatching";
import type { UserProgress } from "./users";

export const WATCHLIST_KEY = "wd-watchlist";
export const BOOKED_KEY = "wd-booked";
export const CONTINUE_KEY = "wd-continue";

export interface ServerLists {
  watchlist: string[];
  bookings: string[];
  progress: Record<string, UserProgress>;
}

// ── local readers/writers ────────────────────────────────────────────────────
function parse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readLocalWatchlist(): string[] {
  const v = parse<string[]>(localStorage.getItem(WATCHLIST_KEY), []);
  return Array.isArray(v) ? v : [];
}

export function writeLocalWatchlist(slugs: string[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(slugs));
  } catch {
    /* ignore */
  }
}

export function readLocalBookings(): string[] {
  const v = parse<Record<string, boolean>>(localStorage.getItem(BOOKED_KEY), {});
  return Object.keys(v ?? {}).filter((slug) => v[slug]);
}

export function writeLocalBookings(slugs: string[]): void {
  try {
    const rec: Record<string, boolean> = {};
    for (const slug of slugs) rec[slug] = true;
    localStorage.setItem(BOOKED_KEY, JSON.stringify(rec));
  } catch {
    /* ignore */
  }
}

export function readLocalContinue(): ContinueItem[] {
  const v = parse<ContinueItem[]>(localStorage.getItem(CONTINUE_KEY), []);
  return Array.isArray(v) ? v : [];
}

export function writeLocalContinue(items: ContinueItem[]): void {
  try {
    localStorage.setItem(CONTINUE_KEY, JSON.stringify(items.slice(0, 20)));
  } catch {
    /* ignore */
  }
}

/** Remove one title's local progress everywhere (per-episode keys + continue list). */
export function clearLocalProgress(slug: string): void {
  try {
    const prefix = `wd-progress:${slug}:`;
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
    writeLocalContinue(readLocalContinue().filter((i) => i.slug !== slug));
  } catch {
    /* ignore */
  }
}

// ── server helpers (all fire-and-forget safe) ────────────────────────────────
async function api(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    return null;
  }
}

export async function fetchServerLists(): Promise<ServerLists | null> {
  const res = await api("/api/user/lists");
  if (!res || !res.ok) return null;
  return (await res.json()) as ServerLists;
}

/** Toggle one slug on the server (no-op when logged out — the API 401s). */
export function syncToggleRemote(
  endpoint: "watchlist" | "bookings",
  slug: string
): void {
  void api(`/api/user/${endpoint}`, {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
}

/** Push one progress entry to the server (no-op when logged out). */
export function syncProgressRemote(entry: {
  slug: string;
  episode: number;
  position: number;
  duration: number;
}): void {
  void api("/api/user/progress", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export function deleteProgressRemote(slug: string): void {
  void api("/api/user/progress", {
    method: "DELETE",
    body: JSON.stringify({ slug }),
  });
}

// ── apply a server list snapshot to localStorage ─────────────────────────────
export function applyServerListsToLocal(lists: ServerLists): void {
  writeLocalWatchlist(lists.watchlist);
  writeLocalBookings(lists.bookings);
  const items: ContinueItem[] = Object.entries(lists.progress)
    .map(([slug, p]) => ({
      slug,
      episode: p.episode,
      progress: p.position,
      duration: p.duration,
      updatedAt: Date.parse(p.updatedAt) || 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  writeLocalContinue(items);
}

// ── guest → account merge (runs right after login/signup) ────────────────────
/**
 * Union the guest's localStorage lists into the account:
 *  - watchlist / bookings: union of local + server, written back with PUT.
 *  - progress: per title, the newer entry wins (server's updatedAt vs the
 *    local continue-watching timestamp). Local winners are POSTed up.
 * Then localStorage is rewritten from the merged server state so both
 * sides agree, and a `wd-lists-changed` event is dispatched.
 */
export async function mergeLocalIntoAccount(): Promise<void> {
  const server = await fetchServerLists();
  if (!server) return; // not logged in — nothing to merge

  const localWatchlist = readLocalWatchlist();
  const localBookings = readLocalBookings();
  const localContinue = readLocalContinue();

  const mergedWatchlist = [...new Set([...server.watchlist, ...localWatchlist])];
  const mergedBookings = [...new Set([...server.bookings, ...localBookings])];

  if (mergedWatchlist.length !== server.watchlist.length) {
    await api("/api/user/watchlist", {
      method: "PUT",
      body: JSON.stringify({ slugs: mergedWatchlist }),
    });
  }
  if (mergedBookings.length !== server.bookings.length) {
    await api("/api/user/bookings", {
      method: "PUT",
      body: JSON.stringify({ slugs: mergedBookings }),
    });
  }

  // Progress: push local entries that are newer than the server's (or
  // missing there). Server entries that are newer simply stay.
  for (const item of localContinue) {
    const serverEntry = server.progress[item.slug];
    const serverMs = serverEntry ? Date.parse(serverEntry.updatedAt) || 0 : 0;
    if (!serverEntry || item.updatedAt > serverMs) {
      await api("/api/user/progress", {
        method: "POST",
        body: JSON.stringify({
          slug: item.slug,
          episode: item.episode,
          position: item.progress,
          duration: item.duration,
        }),
      });
    }
  }

  const finalLists = await fetchServerLists();
  if (finalLists) applyServerListsToLocal(finalLists);
  window.dispatchEvent(new Event("wd-lists-changed"));
  window.dispatchEvent(new Event("wd-auth-changed"));
}
