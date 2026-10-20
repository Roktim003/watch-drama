import { notFound } from "next/navigation";
import { CATEGORIES, getCategory, titlesIn } from "@/lib/catalog";
import TitleCard from "@/components/TitleCard";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  return { title: cat ? `${cat.title} — WatchDrama` : "Browse — WatchDrama" };
}

export default async function BrowsePage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = getCategory(category);
  if (!cat) notFound();
  const items = titlesIn(category);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{cat.title}</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">{cat.description}</p>
      <p className="mt-4 text-sm text-zinc-500">{items.length} titles</p>
      {items.length === 0 ? (
        <p className="mt-8 text-zinc-400">No titles in this category yet.</p>
      ) : (
        <div className="mt-5 flex flex-wrap gap-4">
          {items.map((t) => (
            <TitleCard key={t.slug} title={t} />
          ))}
        </div>
      )}
    </div>
  );
}
