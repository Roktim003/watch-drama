# WatchDrama

A MovieBox-style streaming website (dark theme) built for the site owner's
**own hosted video files**. Phase 1 MVP.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · hls.js

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## What's inside

| Route | What it is |
|---|---|
| `/` | Hero + category rows (Trending, Turkish Drama, K-Drama, C-Drama, Anime, Action, Hot Short TV, Romance, Coming Soon) + Continue Watching |
| `/search?q=` | Search over the catalogue |
| `/browse/[category]` | Grid page per category (`movies`, `series`, `turkish-drama`, `k-drama`, `c-drama`, `anime`, `action-movies`, `hot-short-tv`, `romance`, `coming-soon`) |
| `/title/[slug]` | Title detail: metadata, synopsis, seasons/episodes, suggestions |
| `/watch/[slug]/[episode]` | Player page |

**Player features:** HLS (`.m3u8`) via hls.js + direct `.mp4`, multiple named
sources ("servers") per episode with a switcher, HLS quality-level selector,
subtitle (`.vtt`) selector, resume-position and Continue Watching via
localStorage.

**Posters** are generated procedurally in the browser (deterministic
gradient + typography per title, `components/PosterArt.tsx`) — no external
poster images are hotlinked, so the site renders fully offline.

## Adding your own videos

👉 **See [CONTENT.md](./CONTENT.md)** — step-by-step: where to upload your
video files, how to paste the URL into `lib/catalog.ts`, how to add
subtitles and new titles.

All catalogue data lives in **`lib/catalog.ts`**. Demo entries use public
test streams labelled `SAMPLE` (Mux test HLS, Apple BipBop HLS, an ExoPlayer
test-media MP4 — all reachability-verified; the classic Google sample-bucket
MP4 returned 403 in testing, so it is not used) — replace them with your
hosted files before launch.

## Phase 1 limitations

- No user accounts, no backend/database — catalogue is a typed TS file.
- No admin panel; content is edited in `lib/catalog.ts`.
- Book buttons and Continue Watching are stored per-browser (localStorage).
- One season per sample title (the model supports multiple seasons).
