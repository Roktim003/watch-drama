"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchTitles, type Title } from "@/lib/catalog";
import PosterArt from "./PosterArt";
import { useUser } from "./useUser";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Movies", href: "/browse/movies" },
  { label: "Series", href: "/browse/series" },
  { label: "Turkish Drama", href: "/browse/turkish-drama" },
  { label: "K-Drama", href: "/browse/k-drama" },
  { label: "Anime", href: "/browse/anime" },
  { label: "Shorts", href: "/browse/hot-short-tv" },
];

export default function Header() {
  const { user, loading, logout } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Live search runs against the store via the public API (Phase 2) —
  // fetch the slim catalogue once when the overlay is first opened.
  const [slimTitles, setSlimTitles] = useState<Title[]>([]);
  useEffect(() => {
    if (!searchOpen || slimTitles.length > 0) return;
    fetch("/api/public/titles")
      .then((r) => r.json())
      .then((d) => setSlimTitles((d.titles ?? []) as Title[]))
      .catch(() => undefined);
  }, [searchOpen, slimTitles.length]);

  const results = searchTitles(slimTitles, query).slice(0, 8);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0d12]/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0 text-xl font-black tracking-tight text-white">
            Watch<span className="text-red-500">Drama</span>
          </Link>
          <nav className="hidden items-center gap-5 lg:flex">
            {NAV.slice(1).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-zinc-300 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {!loading && !user && (
              <span className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/login"
                  className="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:bg-white/10 hover:text-white"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-red-600 px-3.5 py-1.5 text-sm font-bold text-white hover:bg-red-500"
                >
                  Sign up
                </Link>
              </span>
            )}
            {!loading && user && (
              <span className="relative hidden sm:block">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1 pr-3 text-sm font-semibold text-white hover:bg-white/20"
                  aria-haspopup="menu"
                  aria-expanded={userMenuOpen}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-xs font-black uppercase">
                    {user.name.slice(0, 1)}
                  </span>
                  <span className="max-w-[110px] truncate">{user.name}</span>
                </button>
                {userMenuOpen && (
                  <span
                    className="absolute right-0 top-11 z-50 block w-44 overflow-hidden rounded-xl bg-zinc-900 py-1 ring-1 ring-white/15"
                    role="menu"
                  >
                    <Link
                      href="/my-list"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                    >
                      My List
                    </Link>
                    <Link
                      href="/my-list#history"
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
                    >
                      History
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        void logout().then(() => router.push("/"));
                      }}
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                    >
                      Logout
                    </button>
                  </span>
                )}
              </span>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-red-600"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
            </button>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white lg:hidden"
            >
              ☰
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-zinc-200"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-2">
              {!loading && !user && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 text-sm font-semibold text-zinc-100"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 text-sm font-semibold text-red-400"
                  >
                    Sign up
                  </Link>
                </>
              )}
              {!loading && user && (
                <>
                  <p className="py-1 text-xs text-zinc-500">
                    Signed in as <span className="font-semibold text-zinc-300">{user.name}</span>
                  </p>
                  <Link
                    href="/my-list"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 text-sm font-semibold text-zinc-100"
                  >
                    My List
                  </Link>
                  <Link
                    href="/my-list#history"
                    onClick={() => setMenuOpen(false)}
                    className="block py-2 text-sm font-semibold text-zinc-100"
                  >
                    History
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      void logout().then(() => router.push("/"));
                    }}
                    className="block py-2 text-left text-sm font-semibold text-red-400"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div
            className="mx-auto mt-20 w-full max-w-2xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submitSearch} className="flex overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/20">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies, dramas, anime…"
                className="w-full bg-transparent px-5 py-4 text-lg text-white outline-none placeholder:text-zinc-500"
              />
              <button type="submit" className="shrink-0 bg-red-600 px-5 font-semibold text-white">
                Search
              </button>
            </form>
            {query.trim() && (
              <div className="mt-3 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10">
                {results.length === 0 && (
                  <p className="px-5 py-4 text-sm text-zinc-400">No results for “{query}”.</p>
                )}
                {results.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/title/${t.slug}`}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5"
                  >
                    <PosterArt title={t} className="h-14 w-10 shrink-0 rounded" />
                    <span>
                      <span className="block text-sm font-semibold text-white">{t.name}</span>
                      <span className="block text-xs text-zinc-400">
                        {t.year} · {t.language} · {t.genres.join(" / ")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <p className="mt-3 text-center text-xs text-zinc-500">Press Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}
