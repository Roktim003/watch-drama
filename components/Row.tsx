"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";

export default function Row({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: ReactNode;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    scroller.current?.scrollBy({ left: dir * 640, behavior: "smooth" });
  }

  return (
    <section className="relative mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-lg font-bold text-white sm:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {href && (
            <Link
              href={href}
              className="text-xs font-semibold text-zinc-400 hover:text-red-400"
            >
              More →
            </Link>
          )}
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="hidden h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-600 sm:flex"
          >
            ‹
          </button>
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="hidden h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-600 sm:flex"
          >
            ›
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="scrollbar-hide -mx-1 flex gap-3 overflow-x-auto scroll-smooth px-1 pb-2"
      >
        {children}
      </div>
    </section>
  );
}
