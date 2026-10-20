"use client";

import { useEffect, useState } from "react";
import {
  fetchServerLists,
  readLocalWatchlist,
  syncToggleRemote,
  writeLocalWatchlist,
} from "@/lib/clientLists";

/**
 * "+ My List / ✓ In My List" toggle. Works for guests (localStorage) and
 * syncs to the account when logged in (Phase 3). On mount, if the server
 * has a list for this viewer it wins as the source of truth.
 */
export default function WatchlistButton({ slug }: { slug: string }) {
  const [inList, setInList] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Deferred to a microtask so state updates happen in a callback.
    void Promise.resolve().then(() => {
      setInList(readLocalWatchlist().includes(slug));
      setLoaded(true);
    });
    void fetchServerLists().then((lists) => {
      if (lists) {
        writeLocalWatchlist(lists.watchlist);
        setInList(lists.watchlist.includes(slug));
      }
    });
  }, [slug]);

  function toggle() {
    const next = !inList;
    setInList(next);
    const local = readLocalWatchlist();
    writeLocalWatchlist(
      next ? [...new Set([...local, slug])] : local.filter((s) => s !== slug)
    );
    syncToggleRemote("watchlist", slug); // 401s silently for guests
  }

  return (
    <button
      onClick={toggle}
      disabled={!loaded}
      className={`rounded-lg px-6 py-3 font-bold transition ${
        inList
          ? "bg-emerald-600 text-white hover:bg-emerald-500"
          : "bg-white/15 text-white backdrop-blur hover:bg-white/25"
      }`}
    >
      {inList ? "✓ In My List" : "＋ My List"}
    </button>
  );
}
