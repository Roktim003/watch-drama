import Link from "next/link";
import { connection } from "next/server";
import { getTitles } from "@/lib/store";
import TitlesTable from "@/components/admin/TitlesTable";

export const metadata = { title: { absolute: "Titles — WatchDrama Admin" } };

export default async function AdminTitlesPage() {
  await connection();
  const titles = await getTitles();
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Titles <span className="text-base font-medium text-zinc-500">({titles.length})</span>
        </h1>
        <Link
          href="/admin/titles/new"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500"
        >
          + New title
        </Link>
      </div>
      <TitlesTable titles={titles} />
    </div>
  );
}
