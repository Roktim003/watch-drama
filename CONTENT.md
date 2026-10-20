# How to add your own dramas & movies to WatchDrama

**New in Phase 2:** you no longer edit any code or files. Everything —
titles, episodes, video links, subtitles — is managed in the **admin
panel** in your browser.

---

## Step 0 — Log in to the admin panel

1. Start the site (`npm run dev` or your deployed site).
2. Open **`/admin`** (e.g. `http://localhost:3000/admin`).
3. Enter the admin password. This is the `ADMIN_PASSWORD` from the
   `.env.local` file. If nobody set one, the development default is
   `admin123` — and the panel will show a yellow warning until a real
   password is set.

*What you see:* a login box with the WatchDrama logo. After logging in you
land on the **Dashboard**: four counters (Titles, Episodes, Video sources,
Coming soon), buttons to add/manage titles, and the Import / Export box.

---

## Step 1 — Upload your video file to your hosting

The website does **not** store video files itself. You upload each episode
to a video/file host and get a direct link that ends in `.m3u8` or `.mp4`.

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

## Step 2 — Add a new title in the admin panel

1. In the admin panel, click **+ New title** (top bar) or **+ Add a
   title** on the Dashboard.
2. Fill the **Basic info** form:
   - **Name** — e.g. "Bound by Fate (Arafta)". The **Slug** (the URL,
     e.g. `bound-by-fate-arafta`) fills in automatically; you can change
     it, but keep it lowercase-with-hyphens.
   - **Type** — Series, Movie, or Short drama.
   - **Year, Rating (0–10), Language** — the language shows as the badge
     on the poster card.
   - **Synopsis** and **Cast** (names separated by commas), **Genres**
     (comma separated, e.g. `Drama, Romance`).
   - **Poster / Backdrop image URL** (optional) — paste a direct image
     link if you have real artwork. Leave blank and the site generates
     poster art automatically from the title name. It just works.
   - **Categories** — tick where the title should appear (Turkish Drama,
     K-Drama, Romance…). The Movies/Series pages are automatic by Type.
   - **Flags** — *Featured* puts it in the big homepage banner (tick it on
     ONE title). *Trending* adds it to the Trending Now row. *Limited
     Free* shows the yellow badge.
   - **Coming Soon** — tick this for unreleased titles and set the
     **Release date** label (e.g. `Nov 4`) and a starting **Booked
     count**. The site shows a Book button instead of episodes.
3. Scroll to **Seasons & episodes** (next step), then click
   **Create title** at the bottom.

*What you see if something is wrong:* a red box at the top of the form
explaining exactly what to fix (e.g. "Slug is required"). Nothing is
saved until the errors are fixed.

---

## Step 3 — Add episodes, video links and subtitles

Still on the same form, in the **Seasons & episodes** section:

*What you see:* a "Season 1" box containing "Episode 1", with a
**Source** row under it: a name box ("Server 1"), a long URL box, and a
dropdown (HLS .m3u8 / MP4).

1. **Paste your video link** from Step 1 into the Source URL box. Set the
   dropdown to **HLS (.m3u8)** or **MP4** to match the link. Give the
   source a name like "Server 1" — viewers see these names in the
   player's server switcher.
2. **More servers (optional):** click **+ Add source** and paste a second
   link (e.g. a backup host). If one host is slow, viewers can switch.
3. **Subtitles (optional):** click **+ Add subtitle (.vtt)**. Upload your
   subtitle file (WebVTT format, ending `.vtt`) to your host, then paste
   its link and type the language name (English, Bangla…). Viewers pick
   the language from the Subtitles menu under the player. A sample file
   lives at `public/subtitles/sample-en.vtt` so you can see the format.
4. **More episodes:** click **+ Add episode** and repeat. Fill the
   episode number, name and duration ("42 min").
5. **More seasons:** click **+ Add season** at the top of the section.
6. Click **Create title** / **Save changes** at the bottom.

For a **movie**, just use one season with one episode — that's its video.

---

## Step 4 — Check it on the site

Click **View site ↗** in the admin top bar. Your title appears on the
homepage and in its categories **immediately** — no rebuild, no restart.
Click the title → check the poster, synopsis and episode list → click an
episode and press play to confirm your video link works.

To change anything later: **Admin → Titles → Edit** on that title.
**Delete** (with a confirmation) removes it from the site.

---

## Step 5 — Replace the sample videos before launch

The starter catalogue uses public test streams labelled **SAMPLE**.
Edit each sample title in the admin panel and swap its episode sources
for your real hosted links (Step 3), or delete titles you don't want.

---

## Backup & moving the catalogue

All content lives in one file: **`data/catalog.json`**.

- **Backup:** Dashboard → **Export catalogue JSON** downloads the whole
  catalogue. Keep that file safe — it *is* your content database.
- **Restore / move to another server:** Dashboard → **Import catalogue
  JSON**, choose the exported file. ⚠️ Import **replaces everything**
  currently on the site (the panel asks you to confirm first). The file
  is checked before anything changes — if it's invalid, you'll see the
  error and nothing is touched.
- You can also copy `data/catalog.json` directly when the server is
  stopped.
