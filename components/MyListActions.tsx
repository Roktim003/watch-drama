"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  clearLocalProgress,
  deleteProgressRemote,
  readLocalBookings,
  readLocalWatchlist,
  syncToggleRemote,
  writeLocalBookings,
  writeLocalWatchlist,
} from "@/lib/clientLists";

const btnCls =
  "rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-red-600 hover:text-white disabled:opacity-50";

/** Remove a title from the watchlist or bookings (server + local). */
export function RemoveSlugButton({
  endpoint,
  slug,
  label = "Remove",
}: {
  endpoint: "watchlist" | "bookings";
  slug: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function onClick() {
    setBusy(true);
    if (endpoint === "watchlist") {
      writeLocalWatchlist(readLocalWatchlist().filter((s) => s !== slug));
    } else {
      writeLocalBookings(readLocalBookings().filter((s) => s !== slug));
    }
    syncToggleRemote(endpoint, slug); // server: toggles it off
    // Give the toggle a moment to land, then re-render from the server.
    setTimeout(() => router.refresh(), 350);
  }

  return (
    <button onClick={onClick} disabled={busy} className={btnCls}>
      {busy ? "Removing…" : label}
    </button>
  );
}

/** Clear one title's watch progress (server + local). */
export function ClearProgressButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function onClick() {
    setBusy(true);
    clearLocalProgress(slug);
    deleteProgressRemote(slug);
    setTimeout(() => router.refresh(), 350);
  }

  return (
    <button onClick={onClick} disabled={busy} className={btnCls}>
      {busy ? "Clearing…" : "Clear progress"}
    </button>
  );
}
