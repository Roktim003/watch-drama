"use client";

import { useEffect, useState } from "react";

const KEY = "wd-booked";

export default function BookButton({
  slug,
  baseCount = 0,
}: {
  slug: string;
  baseCount?: number;
}) {
  const [booked, setBooked] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored: Record<string, boolean> = JSON.parse(
        localStorage.getItem(KEY) ?? "{}"
      );
      setBooked(!!stored[slug]);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [slug]);

  function toggle() {
    const next = !booked;
    setBooked(next);
    try {
      const stored: Record<string, boolean> = JSON.parse(
        localStorage.getItem(KEY) ?? "{}"
      );
      stored[slug] = next;
      localStorage.setItem(KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }

  const count = baseCount + (booked ? 1 : 0);

  return (
    <button
      onClick={toggle}
      disabled={!loaded}
      className={`mt-2 w-full rounded-md px-3 py-1.5 text-xs font-semibold transition ${
        booked
          ? "bg-emerald-600 text-white"
          : "bg-white/10 text-white hover:bg-red-600"
      }`}
    >
      {booked ? "✓ Booked" : "＋ Book"} · {count.toLocaleString()} booked
    </button>
  );
}
