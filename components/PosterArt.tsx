import type { Title } from "@/lib/catalog";

// Procedural poster art: a deterministic gradient + pattern + typography
// generated from the title's slug. Always renders, works fully offline,
// and never hotlinks an external poster image.

const PALETTES: Array<[string, string, string]> = [
  ["#7c2d12", "#dc2626", "#f59e0b"],
  ["#1e3a8a", "#2563eb", "#38bdf8"],
  ["#581c87", "#9333ea", "#f472b6"],
  ["#064e3b", "#059669", "#a3e635"],
  ["#831843", "#db2777", "#fb923c"],
  ["#0c4a6e", "#0284c7", "#2dd4bf"],
  ["#451a03", "#b45309", "#fde68a"],
  ["#312e81", "#6366f1", "#c084fc"],
  ["#7f1d1d", "#ef4444", "#fca5a5"],
  ["#134e4a", "#14b8a6", "#facc15"],
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h;
}

/** The fields PosterArt needs — lets slim API results be passed too. */
export type PosterArtTitle = Pick<
  Title,
  "slug" | "name" | "genres" | "language" | "posterUrl" | "backdropUrl"
>;

export default function PosterArt({
  title,
  wide = false,
  className = "",
}: {
  title: PosterArtTitle;
  wide?: boolean;
  className?: string;
}) {
  // Real artwork wins when the admin has set one (Phase 2).
  const imageUrl = wide ? title.backdropUrl : title.posterUrl;
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title.name}
        className={`object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  const h = hashSlug(title.slug);
  const [c1, c2, c3] = PALETTES[h % PALETTES.length];
  const angle = 120 + (h % 80);
  const cx = 15 + (h % 70);
  const cy = 10 + ((h >> 3) % 40);
  const words = title.name.replace(/[()]/g, "").split(" ");
  const initials = words
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `radial-gradient(circle at ${cx}% ${cy}%, ${c3}55, transparent 55%), linear-gradient(${angle}deg, ${c1}, ${c2})`,
      }}
      aria-hidden="true"
    >
      {/* decorative rings */}
      <svg
        className="absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <circle cx={cx} cy={cy} r="28" fill="none" stroke="white" strokeWidth="0.7" />
        <circle cx={cx} cy={cy} r="42" fill="none" stroke="white" strokeWidth="0.4" />
        <circle cx={100 - cx} cy={100 - cy} r="18" fill="none" stroke="white" strokeWidth="0.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        <span
          className={`font-black tracking-tight text-white/95 drop-shadow ${
            wide ? "text-3xl sm:text-5xl" : "text-xl sm:text-2xl"
          }`}
        >
          {initials}
        </span>
        <span
          className={`mt-1 font-semibold uppercase leading-tight tracking-widest text-white/85 ${
            wide ? "max-w-xl text-sm sm:text-lg" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {title.name}
        </span>
        {!wide && (
          <span className="mt-1 text-[9px] uppercase tracking-[0.25em] text-white/60">
            {title.genres[0] ?? title.language}
          </span>
        )}
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
    </div>
  );
}
