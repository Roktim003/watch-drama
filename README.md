# WatchDrama

A MovieBox-style streaming website (dark theme) built for the site owner's
**own hosted video files**.

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
| `/admin` | **Admin panel (Phase 2)** — login required |

**Player features:** HLS (`.m3u8`) via hls.js + direct `.mp4`, multiple named
sources ("servers") per episode with a switcher, HLS quality-level selector,
subtitle (`.vtt`) selector, resume-position and Continue Watching via
localStorage.

**Posters** are generated procedurally (deterministic gradient + typography
per title, `components/PosterArt.tsx`) — unless the admin sets a real
`posterUrl` / `backdropUrl` on a title, in which case the image is used.

## Phase 2 — Admin panel & data store

The catalogue no longer lives in code. It is stored in a server-side JSON
file and managed from a web admin panel:

- **Data file:** `data/catalog.json` (seeded on first run from the Phase 1
  sample catalogue in `lib/catalog.ts`; regenerate with `npm run seed --
  --force` — note this overwrites admin edits). **Back it up** like any
  database: copy the file, or use Admin → Export.
- **Store module:** `lib/store.ts` — read/write with temp-file + rename
  writes and an in-process cache. Public pages render per-request, so
  admin edits appear on the site immediately, no rebuild.
- **Reads on the site** all go through the store. Client components
  (header search, Continue Watching) use the read-only `/api/public/titles`
  endpoint.

### Logging in

1. Copy `.env.example` to `.env.local` and set a strong `ADMIN_PASSWORD`.
2. Restart the server, open **`/admin`**, and log in with that password.

If `ADMIN_PASSWORD` is not set, the development default **`admin123`** is
used and the admin panel shows a persistent warning banner. Never deploy
without setting a real password.

There is exactly **one** admin (single password, httpOnly session cookie
signed with an HMAC of the password — changing the password logs everyone
out). There are no user accounts in Phase 2.

### What the admin can do

- Dashboard with catalogue counts (titles / episodes / sources / coming soon)
- Titles table with search, edit, delete (with confirm), "view on site"
- Full title form: name, slug, type, year, rating, language, duration,
  synopsis, cast, genres, category checkboxes, featured / trending /
  limited-free / coming-soon flags, release date + booked count,
  poster/backdrop image URLs
- Nested season → episode → source/subtitle manager (the screen used to
  add real video links — see CONTENT.md)
- Export the whole catalogue as JSON; import a JSON catalogue (validated
  first; replaces everything, with a confirmation step)

Admin API (all require the session cookie): `POST /api/admin/login`,
`POST /api/admin/logout`, `GET/POST /api/admin/titles`,
`GET/PUT/DELETE /api/admin/titles/[slug]`, `GET /api/admin/export`,
`POST /api/admin/import`.

### Adding your own videos

👉 **See [CONTENT.md](./CONTENT.md)** — upload your video to your hosting,
then add it in `/admin` (no code editing any more).

Demo entries use public test streams labelled `SAMPLE` (Mux test HLS,
Apple BipBop HLS, an ExoPlayer test-media MP4 — all reachability-verified;
the classic Google sample-bucket MP4 returned 403 in testing, so it is not
used) — replace them with your hosted files before launch.

## Known limitations

- **JSON store, single process:** fine for one server and one admin.
  Concurrent admin edits are serialized in-process, but running multiple
  server instances against the same file is NOT safe. For that, move the
  store to a real database (the `lib/store.ts` interface is the seam).
- No public user accounts, watchlists are per-browser (localStorage).
- `proxy.ts` reads `data/catalog.json` to return real 404s for unknown
  title/watch URLs (streamed pages in Next 16 otherwise soft-404 with 200).
