"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Title } from "@/lib/catalog";
import PosterArt from "./PosterArt";
import Row from "./Row";

export interface ContinueItem {
  slug: string;
  episode: number;
  progress: number; // seconds
  duration: number; // seconds
  updatedAt: number;
}

const KEY = "wd-continue";

export function readContinueWatching(): ContinueItem[] {
  try {
    const list: ContinueItem[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export default function ContinueWatching() {
  const [items, setItems] = useState<ContinueItem[]>([]);
  const [bySlug, setBySlug] = useState<Map<string, Title>>(new Map());

  useEffect(() => {
    // Titles now live in the server store (Phase 2) — resolve the stored
    // slugs against the public slim catalogue.
    fetch("/api/public/titles")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.titles ?? []) as Title[];
        const map = new Map(list.map((t) => [t.slug, t]));
        setBySlug(map);
        setItems(
          readContinueWatching()
            .filter((i) => map.has(i.slug) && i.progress > 5)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 10)
        );
      })
      .catch(() => undefined);
  }, []);

  if (items.length === 0) return null;

  return (
    <Row title="Continue Watching">
      {items.map((item) => {
        const title = bySlug.get(item.slug)!;
        const pct =
          item.duration > 0
            ? Math.min(100, Math.round((item.progress / item.duration) * 100))
            : 0;
        return (
          <Link
            key={`${item.slug}-${item.episode}`}
            href={`/watch/${item.slug}/${item.episode}`}
            className="group w-[220px] shrink-0"
          >
            <div className="relative overflow-hidden rounded-lg ring-1 ring-white/10 group-hover:ring-red-500/60">
              <PosterArt title={title} wide className="aspect-video w-full" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-lg text-white ring-1 ring-white/40">
                  ▶
                </span>
              </span>
              <span className="absolute bottom-0 left-0 h-1 bg-red-600" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 truncate text-sm font-semibold text-zinc-100 group-hover:text-red-400">
              {title.name}
            </p>
            <p className="text-xs text-zinc-400">
              Episode {item.episode} · {pct}% watched
            </p>
          </Link>
        );
      })}
    </Row>
  );
}
