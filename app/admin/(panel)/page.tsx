import Link from "next/link";
import { connection } from "next/server";
import { getTitles } from "@/lib/store";
import ImportExport from "@/components/admin/ImportExport";

export const metadata = { title: "Admin Dashboard — WatchDrama" };

export default async function AdminDashboard() {
  await connection();
  const titles = await getTitles();
  const episodes = titles.reduce(
    (n, t) => n + t.seasons.reduce((m, s) => m + s.episodes.length, 0),
    0
  );
  const sources = titles.reduce(
    (n, t) =>
      n +
      t.seasons.reduce(
        (m, s) => m + s.episodes.reduce((k, e) => k + e.sources.length, 0),
        0
      ),
    0
  );
  const comingSoon = titles.filter((t) => t.comingSoon).length;

  const stats = [
    { label: "Titles", value: titles.length },
    { label: "Episodes", value: episodes },
    { label: "Video sources", value: sources },
    { label: "Coming soon", value: comingSoon },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Everything on the public site is driven by this catalogue, stored in{" "}
          <code className="text-zinc-300">data/catalog.json</code>. Changes go
          live immediately — no rebuild needed.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/10">
            <p className="text-3xl font-black text-white">{s.value}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/titles/new"
          className="rounded-lg bg-red-600 px-5 py-2.5 font-bold text-white hover:bg-red-500"
        >
          + Add a title
        </Link>
        <Link
          href="/admin/titles"
          className="rounded-lg bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20"
        >
          Manage titles
        </Link>
      </div>

      <ImportExport />
    </div>
  );
}
