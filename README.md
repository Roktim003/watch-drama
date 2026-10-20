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
| `/login`, `/signup` | **Viewer accounts (Phase 3)** |
| `/my-list` | Watchlist, bookings, continue watching (Phase 3) — login required |

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

## Phase 3 — Viewer accounts & synced lists

Browsing and watching are **always free with no account** (like MovieBox).
An account is only for syncing personal lists across devices.

- **Accounts:** `/signup` + `/login` (name, email, password ≥ 8 chars).
  Passwords are hashed with **scrypt** (Node built-in crypto, per-user
  random salt) — plaintext passwords are never stored. There is **no
  email verification and no password reset** in Phase 3; if a viewer
  forgets their password, an admin can delete their record from
  `data/users.json` and they sign up again.
- **Data:** accounts live in **`data/users.json`** (same JSON-store
  pattern as the catalogue; seeded empty on first run). **Back it up**
  together with `data/catalog.json`. Each record holds the viewer's
  watchlist (title slugs), bookings (coming-soon slugs) and progress
  (`{ [slug]: { episode, position, duration, updatedAt } }`).
- **Sessions:** a separate httpOnly cookie `wd_user` (the admin cookie is
  `wd_admin` — **admin and viewer accounts are completely separate**;
  the admin password does not log you in as a viewer and vice versa).
  The token is an HMAC-signed payload with a 30-day expiry, signed with
  `USER_SESSION_SECRET` (see `.env.example`). `/my-list` is protected in
  `proxy.ts` before rendering, so logged-out visitors get a clean
  redirect to `/login` with no user data in the response.
- **What syncs:** the "+ My List" button on title pages, Book buttons,
  and playback progress. The player keeps saving to localStorage and,
  when logged in, also posts progress to the server (fire-and-forget);
  on the watch page, the newer of local/server progress wins.
- **Guest → account merge:** right after login/signup, whatever the
  guest had in this browser (localStorage `wd-watchlist`, `wd-booked`,
  `wd-continue`) is merged into the account — union for lists; for
  progress, the entry with the newer timestamp wins per title — and
  localStorage is rewritten from the merged account state.
- **Sync API design:** `GET /api/user/lists` returns all three lists.
  `PUT /api/user/watchlist` / `PUT /api/user/bookings` replace a whole
  list with `{ slugs: string[] }` (used by the merge); `POST` on the
  same paths toggles one title with `{ slug }` (used by the buttons).
  `POST /api/user/progress` upserts `{ slug, episode, position,
  duration }`; `DELETE /api/user/progress` removes one entry. All of
  them require the viewer session (401 otherwise) and validate that
  slugs exist in the catalogue (400 for unknown slugs).
  Auth API: `POST /api/auth/signup` (201), `POST /api/auth/login`,
  `POST /api/auth/logout`, `GET /api/auth/me`.

## Phase 4 — Deployment readiness

The project now ships as a deploy-ready launch package. **The full
runbook is [DEPLOY.md](./DEPLOY.md)** — Route A (VPS + Docker) works
as-is; Route B (Vercel) does **not**, because serverless filesystems
can't persist the JSON stores (a store-to-database migration would be a
separate mini-phase; `lib/store.ts` / `lib/users.ts` are the seam).

- **Persistent data dir (`DATA_DIR`):** `lib/dataDir.ts` is the single
  place that decides where `catalog.json` + `users.json` live —
  `$DATA_DIR` when set, `./data` otherwise (local dev unchanged). On
  first run in a fresh `DATA_DIR`, the stores seed from the bundled
  `data/` defaults shipped with the app. `proxy.ts` reads the same
  location for its real-404 checks. In Docker, a named volume is mounted
  at `/app/data-persist`, so data survives rebuilds/redeploys.
- **Docker:** multi-stage `Dockerfile` (Node 22 Alpine; standalone Next
  output; non-root user; `node server.js` on port 3000) +
  `docker-compose.yml` (one service, `3000:3000`, `env_file`, named
  volume, `restart: unless-stopped`) + `.dockerignore`.
- **Health check:** `GET /api/health` (no auth) →
  `{ ok, titles, users, uptime }` — counts only, no sensitive data.
- **SEO:** real `/robots.txt` (allows public pages, disallows `/admin`
  and `/api/`, points at the sitemap) and a dynamic `/sitemap.xml`
  (home, every `/browse/<category>`, every `/title/<slug>` from the live
  store). Unique per-page `<title>`/descriptions + Open Graph via
  `NEXT_PUBLIC_SITE_URL` (see `.env.example`) and the root layout's title
  template. Note: `robots.txt` is generated at build time, so set
  `NEXT_PUBLIC_SITE_URL` **before** building (the compose file passes it
  as a build argument).
- **Security headers** on all responses (`next.config.ts`): `nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` with
  camera/microphone/geolocation off. **No CSP on purpose:** hls.js loads
  workers from `blob:` URLs and plays video from arbitrary hosts the
  admin configures, so a generic CSP would break playback; add a
  tailored one at the reverse proxy if your video hosts are fixed.
- **Production safety:** if `ADMIN_PASSWORD` is unset in production, the
  server logs a loud SECURITY WARNING at startup (`instrumentation.ts`)
  on top of the admin banner. `.env.example` marks which variables are
  **REQUIRED before go-live** (`ADMIN_PASSWORD`, `USER_SESSION_SECRET`,
  `NEXT_PUBLIC_SITE_URL`).

## Known limitations

- **JSON stores, single process:** fine for one server. Writes are
  serialized in-process, but running multiple server instances against
  the same files is NOT safe. For that, move the stores to a real
  database (the `lib/store.ts` / `lib/users.ts` interfaces are the seam).
- Viewer accounts (Phase 3): single shared JSON store, no email
  verification, no password reset, no social login, no per-session
  revocation (changing `USER_SESSION_SECRET`/`ADMIN_PASSWORD` logs all
  viewers out). Guest lists live in localStorage and only merge into an
  account in the browser where the guest data exists.
- `proxy.ts` reads `catalog.json` (from `DATA_DIR` when set, else
  `data/`) to return real 404s for unknown title/watch URLs (streamed
  pages in Next 16 otherwise soft-404 with 200).
- Deployment (Phase 4): single-container Docker / single server only —
  the JSON stores are still single-process (see above), so don't scale
  to multiple app instances behind a load balancer. No CSP header is
  set by the app (reason documented in `next.config.ts` / DEPLOY.md).
