import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "WatchDrama — Watch Movies, Series & Dramas Online",
  description:
    "WatchDrama: Turkish drama, K-Drama, C-Drama, anime, movies and short dramas in HD.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[#0b0d12] text-zinc-100">
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 py-8">
          <div className="mx-auto w-full max-w-7xl px-4 text-sm text-zinc-500 sm:px-6">
            <p className="font-bold text-zinc-300">
              Watch<span className="text-red-500">Drama</span>
            </p>
            <p className="mt-2 max-w-xl">
              All sample streams are public test streams — the site owner
              replaces them with their own hosted video files through the
              admin panel (see CONTENT.md in the project).
            </p>
            <p className="mt-3 text-xs">© 2026 WatchDrama. For demo purposes.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
