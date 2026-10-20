# How to add your own dramas & movies to WatchDrama

No coding knowledge needed beyond copy-paste. Everything on the site —
every title, episode and video — is listed in **one file**:

```
lib/catalog.ts
```

You only ever edit that file. Follow the steps below.

---

## Step 1 — Upload your video file to your hosting

The website does **not** store video files itself. You upload each episode
to a video/file host and get a direct link that ends in `.m3u8` or `.mp4`.

Good options (any one is fine):

| Host | What you get | Notes |
|---|---|---|
| **Bunny Stream** (bunny.net) | An `.m3u8` HLS link per video | Cheapest for streaming, made for this. Upload video → it converts automatically → copy the "HLS playlist" URL. |
| **Cloudflare Stream** | An `.m3u8` HLS link per video | Upload in the Cloudflare dashboard → copy the HLS URL. |
| **Amazon S3 + CloudFront** (or any S3 bucket + CDN) | A direct `.mp4` link (or `.m3u8` if you upload an HLS folder) | Upload the file, make it public, copy the file URL. |
| **Any direct host** (your own server, R2, Wasabi, etc.) | A direct `.mp4` / `.m3u8` link | The link must play when pasted into a browser — no login page in between. |

✅ **Test your link first:** paste it in a browser. An `.mp4` should start
downloading/playing. An `.m3u8` will download a small text file — that's
normal, it means the link is live.

> Recommendation: use **HLS (`.m3u8`)** when you can. It adapts quality to
> the viewer's internet speed and seeks much better on long episodes.
> Bunny Stream / Cloudflare Stream produce HLS for you automatically.

---

## Step 2 — Paste the link into the catalogue

Open `lib/catalog.ts`. Each episode looks like this:

```ts
{
  number: 1,
  name: "Episode 1",
  duration: "42 min",
  sources: [
    { name: "Server 1", url: "https://YOUR-HOST/episode1.m3u8", type: "hls" },
    { name: "Server 2", url: "https://BACKUP-HOST/episode1.mp4", type: "mp4" },
  ],
  subtitles: [
    { lang: "English", url: "https://YOUR-HOST/episode1-en.vtt" },
  ],
}
```

- Replace the sample `url` with **your** hosted file's URL.
- `type` must be `"hls"` for `.m3u8` links and `"mp4"` for `.mp4` links.
- You can list **several sources** for one episode — viewers get a
  "Server 1 / Server 2" switcher under the player, so if one host is slow
  they can jump to the other. One source is fine too.
- Save the file. Done — the episode now plays your video.

🧹 **Before launch:** search the file for the word `SAMPLE` and replace every
sample stream with one of your real links, so no test video remains.

---

## Step 3 — Add subtitles (optional)

1. Upload your subtitle file (it must be **WebVTT** format, ending in
   `.vtt`) to the same host as your videos.
2. Add a line in that episode's `subtitles` list:

```ts
{ lang: "English", url: "https://YOUR-HOST/ep1-en.vtt" },
{ lang: "Bangla",  url: "https://YOUR-HOST/ep1-bn.vtt" },
```

Viewers pick the language from the **Subtitles** menu under the player.
A sample subtitle file lives at `public/subtitles/sample-en.vtt` so you can
see the format.

---

## Step 4 — Add a brand-new title

Copy any existing block inside `TITLES` in `lib/catalog.ts`, paste it, and
change the fields:

```ts
{
  slug: "my-new-drama",              // unique, lowercase, hyphens only — used in the URL
  name: "My New Drama",
  type: "series",                    // "series" | "movie" | "short"
  year: 2026,
  rating: 8.5,                       // 0–10 (use 0 for Coming Soon)
  language: "Turkish",               // badge shown on the poster card
  categories: ["turkish-drama", "series"],   // which rows/pages it appears in
  genres: ["Drama", "Romance"],
  synopsis: "Write 2–3 sentences here…",
  cast: ["Actor One", "Actor Two"],
  trending: true,                    // optional: show in Trending Now
  limitedFree: true,                 // optional: "Limited Free" badge
  seasons: eps(3),                   // 3 sample episodes — then edit each
                                     // episode's sources as in Step 2
},
```

**Category names you can use:** `turkish-drama`, `k-drama`, `c-drama`,
`anime`, `action-movies`, `hot-short-tv`, `romance`, `coming-soon`
(plus `movies` / `series`, which are automatic by `type`).

**Posters:** you don't need poster images. The site generates poster art
automatically from the title name (each title gets its own colours) —
it just works.

**Coming Soon titles:** set `comingSoon: true`, `releaseDate: "Nov 4"`,
`bookedCount: 1200`, `rating: 0`, and `seasons: []`. The site shows a
release-date badge and a Book button (the count goes up when a visitor
books — stored in their browser).

**Featured hero title:** set `featured: true` on one title to make it the
big banner on the homepage.

---

## Step 5 — See your changes

```bash
npm run dev
```

Open http://localhost:3000 — your title/episode is live locally. When you're
happy, rebuild for production with `npm run build`.
