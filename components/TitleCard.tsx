import Link from "next/link";
import type { Title } from "@/lib/catalog";
import PosterArt from "./PosterArt";
import BookButton from "./BookButton";

export default function TitleCard({ title }: { title: Title }) {
  return (
    <div className="group w-[150px] shrink-0 sm:w-[172px]">
      <Link href={`/title/${title.slug}`} className="block">
        <div className="relative overflow-hidden rounded-lg ring-1 ring-white/10 transition group-hover:ring-red-500/60">
          <PosterArt title={title} className="aspect-[2/3] w-full transition duration-300 group-hover:scale-105" />
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {title.language}
          </span>
          {title.limitedFree && (
            <span className="absolute right-2 top-2 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">
              Limited Free
            </span>
          )}
          {title.comingSoon && title.releaseDate && (
            <span className="absolute bottom-2 left-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {title.releaseDate}
            </span>
          )}
        </div>
        <div className="mt-2 px-0.5">
          <p className="truncate text-sm font-semibold text-zinc-100 group-hover:text-red-400">
            {title.name}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {title.comingSoon
              ? "Coming soon"
              : `${title.year} · ★ ${title.rating.toFixed(1)} · ${title.genres.join(" / ")}`}
          </p>
        </div>
      </Link>
      {title.comingSoon && (
        <BookButton slug={title.slug} baseCount={title.bookedCount ?? 0} />
      )}
    </div>
  );
}
