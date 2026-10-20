// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama catalogue — types + Phase 1 sample catalogue (the SEED).
//
// Phase 2: the live catalogue lives in `data/catalog.json` and is managed
// from the /admin panel (see lib/store.ts). The TITLES list below is only
// used to seed that file on first run (and by scripts/seed-catalog.mjs) —
// editing TITLES does NOT change the live site any more.
//
// To add your own videos, see CONTENT.md. In short: upload to your hosting,
// then paste the .m3u8 / .mp4 URL into the title's sources in /admin.
//
// ⚠️ The streams marked SAMPLE below are public test streams (Mux / Apple /
// ExoPlayer test media). They exist only to demo the player. Replace them
// with your own hosted files before launch.
// ─────────────────────────────────────────────────────────────────────────────

export type SourceType = "hls" | "mp4";

export interface VideoSource {
  /** Display name shown in the player's server switcher, e.g. "Server 1" */
  name: string;
  /** Direct URL to your hosted .m3u8 or .mp4 file. SAMPLE = public test stream. */
  url: string;
  type: SourceType;
}

export interface SubtitleTrack {
  /** e.g. "English", "Bangla", "Turkish" */
  lang: string;
  /** Direct URL to a .vtt subtitle file */
  url: string;
}

export interface Episode {
  number: number;
  name: string;
  duration?: string;
  sources: VideoSource[];
  subtitles: SubtitleTrack[];
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export type TitleType = "movie" | "series" | "short";

export interface Title {
  slug: string;
  name: string;
  type: TitleType;
  year: number;
  rating: number; // 0–10
  language: string; // badge text, e.g. "Turkish", "English", "Korean"
  /** Optional runtime/duration label, e.g. "1h 52m" or "45 min/ep" */
  duration?: string;
  /** Optional real poster image URL. Empty → procedural PosterArt is used. */
  posterUrl?: string;
  /** Optional real backdrop image URL (wide). Empty → procedural PosterArt. */
  backdropUrl?: string;
  /** Category slugs this title appears under — see CATEGORIES below */
  categories: string[];
  genres: string[];
  synopsis: string;
  cast: string[];
  featured?: boolean;
  trending?: boolean;
  limitedFree?: boolean;
  comingSoon?: boolean;
  releaseDate?: string; // e.g. "Oct 29"
  bookedCount?: number;
  seasons: Season[];
}

// ── Sample streams (public test streams — replace with your hosted files) ──
export const SAMPLE_SOURCES: VideoSource[] = [
  {
    name: "Server 1 · SAMPLE",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    type: "hls",
  },
  {
    name: "Server 2 · SAMPLE",
    url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8",
    type: "hls",
  },
  {
    // NOTE: the classic gtv-videos-bucket Sintel.mp4 sample returned 403 in
    // testing, so Server 3 uses Google's ExoPlayer test-media MP4 instead
    // (verified reachable). Still a SAMPLE — replace with your hosted file.
    name: "Server 3 · SAMPLE",
    url: "https://storage.googleapis.com/exoplayer-test-media-0/BigBuckBunny_320x180.mp4",
    type: "mp4",
  },
];

const SAMPLE_SUBTITLES: SubtitleTrack[] = [
  { lang: "English (Sample)", url: "/subtitles/sample-en.vtt" },
];

function eps(count: number): Season[] {
  return [
    {
      number: 1,
      episodes: Array.from({ length: count }, (_, i) => ({
        number: i + 1,
        name: `Episode ${i + 1}`,
        duration: "42 min",
        // Rotate the source order per episode so the switcher demo varies
        sources: [
          SAMPLE_SOURCES[i % SAMPLE_SOURCES.length],
          SAMPLE_SOURCES[(i + 1) % SAMPLE_SOURCES.length],
          SAMPLE_SOURCES[(i + 2) % SAMPLE_SOURCES.length],
        ],
        subtitles: SAMPLE_SUBTITLES,
      })),
    },
  ];
}

// ── Categories ───────────────────────────────────────────────────────────────
export interface Category {
  slug: string;
  title: string;
  description: string;
}

export const CATEGORIES: Category[] = [
  { slug: "movies", title: "Movies", description: "All movies in the catalogue." },
  { slug: "series", title: "Series", description: "All series in the catalogue." },
  { slug: "turkish-drama", title: "Turkish Drama", description: "Turkish series with subtitles — the heart of WatchDrama." },
  { slug: "k-drama", title: "K-Drama", description: "Korean dramas, dubbed and subtitled." },
  { slug: "c-drama", title: "C-Drama", description: "Chinese dramas, historical and modern." },
  { slug: "anime", title: "Anime", description: "Anime series, English dubbed and subbed." },
  { slug: "action-movies", title: "Action Movies", description: "Action, thriller and adventure films." },
  { slug: "hot-short-tv", title: "🔥 Hot Short TV", description: "Bite-sized short dramas — one cliffhanger after another." },
  { slug: "romance", title: "Romance", description: "Love stories from around the world." },
  { slug: "coming-soon", title: "Coming Soon", description: "Upcoming releases — book your seat early." },
];

// ── Catalogue ────────────────────────────────────────────────────────────────
export const TITLES: Title[] = [
  // Turkish Drama (lead category)
  {
    slug: "bound-by-fate-arafta",
    name: "Bound by Fate (Arafta)",
    type: "series",
    year: 2025,
    rating: 8.7,
    language: "Turkish",
    categories: ["turkish-drama", "series", "romance"],
    genres: ["Drama", "Romance"],
    synopsis:
      "Two families bound by an old promise. A marriage arranged to settle a debt becomes a slow-burn story of pride, loyalty and a love neither of them asked for. (Sample catalogue entry — replace the video sources with your hosted files.)",
    cast: ["Lead Actor", "Lead Actress", "Supporting Cast"],
    featured: true,
    trending: true,
    limitedFree: true,
    seasons: eps(3),
  },
  {
    slug: "the-vow-yemin",
    name: "The Vow (Yemin)",
    type: "series",
    year: 2024,
    rating: 8.4,
    language: "Turkish",
    categories: ["turkish-drama", "series", "romance"],
    genres: ["Drama", "Romance"],
    synopsis:
      "A promise made on a deathbed pulls two strangers into the same house — and into each other's lives. A long-running daily drama of sacrifice and second chances.",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    limitedFree: true,
    seasons: eps(3),
  },
  {
    slug: "endless-love-kara-sevda",
    name: "Endless Love (Kara Sevda)",
    type: "series",
    year: 2023,
    rating: 8.9,
    language: "Turkish",
    categories: ["turkish-drama", "series", "romance"],
    genres: ["Drama", "Romance", "Thriller"],
    synopsis:
      "A mining engineer's son and an artist from a wealthy family fall in love — until money, obsession and a ruthless rival tear them apart. Years later, fate brings them back.",
    cast: ["Lead Actor", "Lead Actress", "Antagonist"],
    trending: true,
    seasons: eps(3),
  },
  {
    slug: "magnificent-century",
    name: "Magnificent Century",
    type: "series",
    year: 2022,
    rating: 8.6,
    language: "Turkish",
    categories: ["turkish-drama", "series"],
    genres: ["Historical", "Drama"],
    synopsis:
      "Inside the palace of an empire at its peak: sultans, scheming queens and the woman who rose from captive to the most powerful figure in the court.",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(2),
  },
  {
    slug: "resurrection-ertugrul",
    name: "Resurrection: Ertuğrul",
    type: "series",
    year: 2021,
    rating: 9.1,
    language: "Turkish",
    categories: ["turkish-drama", "series", "action-movies"],
    genres: ["Historical", "Action", "Adventure"],
    synopsis:
      "A warrior tribe fights for survival on the edge of two empires. The legendary story of the man whose son would found an empire.",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    seasons: eps(3),
  },
  {
    slug: "you-knock-on-my-door",
    name: "You Knock on My Door",
    type: "series",
    year: 2023,
    rating: 8.2,
    language: "Turkish",
    categories: ["turkish-drama", "series", "romance"],
    genres: ["Romance", "Comedy"],
    synopsis:
      "A florist with big dreams and a cold perfectionist architect fake an engagement for two months. What could possibly go wrong?",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(2),
  },
  {
    slug: "fatmagul",
    name: "Fatmagül",
    type: "series",
    year: 2020,
    rating: 8.8,
    language: "Turkish",
    categories: ["turkish-drama", "series"],
    genres: ["Drama"],
    synopsis:
      "A young woman in a small coastal town fights for justice and rebuilds her life, in one of the most talked-about Turkish dramas ever made.",
    cast: ["Lead Actress", "Lead Actor"],
    seasons: eps(2),
  },

  // K-Drama
  {
    slug: "crash-landing-on-you",
    name: "Crash Landing on You",
    type: "series",
    year: 2023,
    rating: 9.0,
    language: "Korean",
    categories: ["k-drama", "series", "romance"],
    genres: ["Romance", "Drama"],
    synopsis:
      "A paragliding accident drops a South Korean heiress into North Korea — and into the life of the army captain who decides to hide her.",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    limitedFree: true,
    seasons: eps(3),
  },
  {
    slug: "business-proposal",
    name: "Business Proposal",
    type: "series",
    year: 2024,
    rating: 8.5,
    language: "Korean",
    categories: ["k-drama", "series", "romance"],
    genres: ["Romance", "Comedy"],
    synopsis:
      "She goes on a blind date in her friend's place — and the date turns out to be her company's CEO. A fake relationship contract follows.",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(2),
  },
  {
    slug: "queen-of-tears",
    name: "Queen of Tears",
    type: "series",
    year: 2024,
    rating: 8.8,
    language: "Korean",
    categories: ["k-drama", "series", "romance"],
    genres: ["Romance", "Drama"],
    synopsis:
      "A married couple on the edge of divorce fall in love all over again after a diagnosis turns their world upside down.",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    seasons: eps(2),
  },

  // C-Drama
  {
    slug: "hidden-love",
    name: "Hidden Love",
    type: "series",
    year: 2023,
    rating: 8.7,
    language: "Chinese",
    categories: ["c-drama", "series", "romance"],
    genres: ["Romance", "Youth"],
    synopsis:
      "She has loved her brother's best friend since she was fourteen. A gentle, slow-burn campus romance about growing up and being brave.",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(2),
  },
  {
    slug: "the-untamed",
    name: "The Untamed",
    type: "series",
    year: 2022,
    rating: 9.2,
    language: "Chinese",
    categories: ["c-drama", "series"],
    genres: ["Fantasy", "Action", "Historical"],
    synopsis:
      "Two cultivators with opposite temperaments unravel a sixteen-year-old mystery in a world of clans, swords and dark magic.",
    cast: ["Lead Actor", "Lead Actor"],
    trending: true,
    seasons: eps(3),
  },
  {
    slug: "eternal-love",
    name: "Eternal Love",
    type: "series",
    year: 2021,
    rating: 8.9,
    language: "Chinese",
    categories: ["c-drama", "series", "romance"],
    genres: ["Fantasy", "Romance", "Historical"],
    synopsis:
      "A love that survives three lifetimes, three worlds — gods, mortals and demons collide in this sweeping xianxia epic.",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(2),
  },

  // Anime
  {
    slug: "solo-leveling",
    name: "Solo Leveling",
    type: "series",
    year: 2024,
    rating: 9.3,
    language: "English Dub",
    categories: ["anime", "series", "action-movies"],
    genres: ["Anime", "Action", "Fantasy"],
    synopsis:
      "The world's weakest hunter gains a mysterious system that lets him level up without limit. From prey to predator.",
    cast: ["Voice Cast"],
    trending: true,
    limitedFree: true,
    seasons: eps(3),
  },
  {
    slug: "jujutsu-kaisen",
    name: "Jujutsu Kaisen",
    type: "series",
    year: 2023,
    rating: 9.0,
    language: "English Dub",
    categories: ["anime", "series", "action-movies"],
    genres: ["Anime", "Action", "Supernatural"],
    synopsis:
      "A high-schooler swallows a cursed finger and becomes the vessel of the King of Curses. Now he hunts curses — before they hunt everyone else.",
    cast: ["Voice Cast"],
    seasons: eps(2),
  },
  {
    slug: "frieren",
    name: "Frieren: Beyond Journey's End",
    type: "series",
    year: 2024,
    rating: 9.4,
    language: "Japanese · Sub",
    categories: ["anime", "series"],
    genres: ["Anime", "Fantasy", "Drama"],
    synopsis:
      "The hero's party defeated the Demon King decades ago. For an elf who lives a thousand years, learning what those ten years meant takes another journey.",
    cast: ["Voice Cast"],
    seasons: eps(2),
  },

  // Movies / Action / Romance
  {
    slug: "sintel-the-movie",
    name: "Sintel — The Movie (Sample Film)",
    type: "movie",
    year: 2022,
    rating: 8.1,
    language: "English",
    categories: ["movies", "action-movies"],
    genres: ["Fantasy", "Adventure"],
    synopsis:
      "A lonely young woman searches the frozen wastes for the dragon she once rescued. Sample catalogue entry — its episodes demo the HLS and MP4 sample streams.",
    cast: ["Voice Cast"],
    seasons: eps(1),
  },
  {
    slug: "extraction-point",
    name: "Extraction Point",
    type: "movie",
    year: 2025,
    rating: 7.9,
    language: "English",
    categories: ["movies", "action-movies"],
    genres: ["Action", "Thriller"],
    synopsis:
      "One night, one city, one way out. A getaway driver takes a final job that turns into a fight for survival. (Sample catalogue entry.)",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    seasons: eps(1),
  },
  {
    slug: "the-love-hypothesis",
    name: "The Love Hypothesis",
    type: "movie",
    year: 2025,
    rating: 8.3,
    language: "English",
    categories: ["movies", "romance"],
    genres: ["Romance", "Comedy"],
    synopsis:
      "A PhD candidate and a grumpy professor agree to a fake relationship to test a hypothesis about love. The data surprises them both. (Sample catalogue entry.)",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    limitedFree: true,
    seasons: eps(1),
  },
  {
    slug: "my-fault-london",
    name: "My Fault: London",
    type: "movie",
    year: 2025,
    rating: 7.8,
    language: "English",
    categories: ["movies", "romance"],
    genres: ["Romance", "Drama"],
    synopsis:
      "New city, new family, and a stepbrother who is strictly off limits — in every way except the one that matters. (Sample catalogue entry.)",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(1),
  },

  // Hot Short TV
  {
    slug: "the-hidden-billionaire",
    name: "The Hidden Billionaire Returns",
    type: "short",
    year: 2025,
    rating: 8.0,
    language: "English",
    categories: ["hot-short-tv"],
    genres: ["Short Drama", "Revenge", "Romance"],
    synopsis:
      "Humiliated as a poor son-in-law for three years, he finally reveals who he really is. One-minute episodes, endless cliffhangers. (Sample catalogue entry.)",
    cast: ["Lead Actor", "Lead Actress"],
    trending: true,
    limitedFree: true,
    seasons: eps(3),
  },
  {
    slug: "divorced-by-mistake",
    name: "Divorced by Mistake",
    type: "short",
    year: 2025,
    rating: 7.7,
    language: "English",
    categories: ["hot-short-tv", "romance"],
    genres: ["Short Drama", "Romance"],
    synopsis:
      "A filing error marries her to a stranger — and divorces her from her fiancé. Now the stranger refuses to sign. (Sample catalogue entry.)",
    cast: ["Lead Actor", "Lead Actress"],
    seasons: eps(3),
  },

  // Coming Soon
  {
    slug: "the-remarried-empress",
    name: "The Remarried Empress",
    type: "series",
    year: 2026,
    rating: 0,
    language: "Korean",
    categories: ["k-drama", "series", "coming-soon"],
    genres: ["Fantasy", "Romance"],
    synopsis:
      "Betrayed by her emperor husband, a perfect empress agrees to a divorce — on one condition: she gets to remarry the neighbouring prince.",
    cast: ["To be announced"],
    comingSoon: true,
    releaseDate: "Nov 4",
    bookedCount: 14570,
    seasons: [],
  },
  {
    slug: "istanbul-nights",
    name: "Istanbul Nights",
    type: "series",
    year: 2026,
    rating: 0,
    language: "Turkish",
    categories: ["turkish-drama", "series", "coming-soon"],
    genres: ["Drama", "Romance"],
    synopsis:
      "A night-shift taxi driver and a runaway heiress meet on the Bosphorus bridge at 3 a.m. The city's most anticipated new Turkish drama.",
    cast: ["To be announced"],
    comingSoon: true,
    releaseDate: "Oct 29",
    bookedCount: 11448,
    seasons: [],
  },
  {
    slug: "black-clover-movie",
    name: "Black Clover: The Movie",
    type: "movie",
    year: 2026,
    rating: 0,
    language: "English Dub",
    categories: ["anime", "movies", "coming-soon"],
    genres: ["Anime", "Action"],
    synopsis: "Asta faces the Wizard Kings of the past in an all-new original film adventure.",
    cast: ["Voice Cast"],
    comingSoon: true,
    releaseDate: "Oct 30",
    bookedCount: 5840,
    seasons: [],
  },
  {
    slug: "make-me-tremble",
    name: "Make Me Tremble",
    type: "short",
    year: 2026,
    rating: 0,
    language: "English",
    categories: ["hot-short-tv", "coming-soon"],
    genres: ["Short Drama", "Romance"],
    synopsis: "The short drama everyone will be talking about next month. Book early.",
    cast: ["To be announced"],
    comingSoon: true,
    releaseDate: "Oct 16",
    bookedCount: 27806,
    seasons: [],
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
// Phase 2: these are pure functions over a titles array — the array now
// comes from the server-side store (lib/store.ts), not from TITLES directly.
export function getTitle(titles: Title[], slug: string): Title | undefined {
  return titles.find((t) => t.slug === slug);
}

export function titlesIn(titles: Title[], categorySlug: string): Title[] {
  if (categorySlug === "movies") return titles.filter((t) => t.type === "movie");
  if (categorySlug === "series") return titles.filter((t) => t.type === "series");
  return titles.filter((t) => t.categories.includes(categorySlug));
}

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

/** Find an episode by number within a title (across seasons, in order). */
export function findEpisode(
  title: Title,
  episodeNumber: number
): { season: Season; episode: Episode } | undefined {
  for (const season of title.seasons) {
    const episode = season.episodes.find((e) => e.number === episodeNumber);
    if (episode) return { season, episode };
  }
  return undefined;
}

export function firstEpisodeNumber(title: Title): number | undefined {
  return title.seasons[0]?.episodes[0]?.number;
}

export function searchTitles(titles: Title[], query: string): Title[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return titles.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.genres.some((g) => g.toLowerCase().includes(q)) ||
      t.language.toLowerCase().includes(q) ||
      t.categories.some((c) => c.replace(/-/g, " ").includes(q))
  );
}

export function suggestedTitles(titles: Title[], title: Title, count = 8): Title[] {
  return titles.filter(
    (t) =>
      t.slug !== title.slug &&
      t.categories.some((c) => title.categories.includes(c))
  ).slice(0, count);
}
