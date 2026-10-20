# Deploying WatchDrama — Launch Runbook

Everything needed to put WatchDrama on the internet is in this project.
Pick **Route A** unless you have a specific reason not to — it's the one
that works exactly as the project ships.

| | Route A — VPS + Docker ⭐ | Route B — Vercel |
|---|---|---|
| Works as-is? | ✅ Yes | ❌ Not yet (see below) |
| Monthly cost | ~US $6–12 VPS | Free tier exists, but needs a database migration first |
| Your data lives | On the VPS, in a Docker volume | — |
| HTTPS | Automatic (Caddy) | Automatic |

---

## Route A — VPS + Docker (recommended)

### 1. Get a server

Buy any small VPS (Hetzner, DigitalOcean, Vultr, Linode…):

- **Minimum:** 1 vCPU, **2 GB RAM**, 20 GB disk, Ubuntu 22.04/24.04
- (1 GB RAM can work but builds get tight — 2 GB is the comfortable floor.)

### 2. Point your domain at it

At your domain registrar / DNS provider, add:

```
Type: A     Name: @     Value: <your VPS IP address>
Type: A     Name: www   Value: <your VPS IP address>
```

Wait until `ping yourdomain.com` shows the VPS IP (usually minutes,
sometimes up to an hour).

### 3. Install Docker on the VPS

```bash
ssh root@<your VPS IP>
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
```

### 4. Get the project onto the VPS

```bash
git clone https://github.com/Roktim003/watch-drama.git
cd watch-drama
```

(No GitHub handy? Copy the unzipped project folder up with `scp` instead —
same thing. What matters is that `Dockerfile` and `docker-compose.yml`
are in the folder you `cd` into.)

### 5. Create your `.env` with real secrets

```bash
cp .env.example .env
nano .env
```

Set at least these three:

```bash
ADMIN_PASSWORD=<a long, unique password — this guards /admin>
USER_SESSION_SECRET=<long random string — run: openssl rand -hex 32>
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

> `NEXT_PUBLIC_SITE_URL` is baked into page metadata **when the image is
> built**, so set it before the next step. (If you change the domain
> later, just rebuild: `docker compose up -d --build`.)

### 6. Build & start

```bash
docker compose up -d
docker compose logs -f   # watch it start; Ctrl+C to stop watching
```

### 7. Verify

```bash
curl http://localhost:3000/api/health
# → {"ok":true,"titles":26,"users":0,"uptime":...}
```

`ok: true` = the app is up and reading its data store.

### 8. Put HTTPS in front — Caddy (easiest, automatic certificates)

Install Caddy (https://caddyserver.com/docs/install — Debian/Ubuntu
package), then create `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    reverse_proxy localhost:3000
}

www.yourdomain.com {
    redir https://yourdomain.com{uri} permanent
}
```

```bash
sudo systemctl reload caddy
```

Done — Caddy gets a Let's Encrypt certificate by itself and renews it
forever. Visit `https://yourdomain.com`.

**Alternative — Nginx + certbot.** `/etc/nginx/sites-available/watchdrama`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/watchdrama /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Where your data lives (important!)

The catalogue and user accounts are **not** inside the container. They
live in the Docker volume `watchdrama-data`, mounted at
`/app/data-persist` (`DATA_DIR`). Rebuilding or redeploying the app never
touches them. The sample `data/` folder in the project is only used to
seed a brand-new volume on first run.

---

## Route B — Vercel (does NOT work as-is)

Vercel is a great host for Next.js, but **don't deploy this project there
yet.** Vercel runs the app on serverless functions with an **ephemeral
filesystem**: the JSON data stores (`catalog.json`, `users.json`) would be
read-only / wiped between requests, so the admin panel couldn't save
titles and viewer accounts couldn't persist.

To use Vercel, the two stores first need to move to a hosted data service
— e.g. **Postgres** (Neon/Supabase) or **Redis/KV** (Upstash). The code is
prepared for this: `lib/store.ts` and `lib/users.ts` are the only files
that touch the files, so it's a contained **mini-phase**: swap those two
modules' internals for database calls, keep every API and page the same.
Ask for "Phase 4B — database migration" if you choose this route.

---

## Post-launch checklist

- [ ] `ADMIN_PASSWORD` set to a real, unique password (not `admin123`) —
      check `docker compose logs`: there must be **no** SECURITY WARNING.
- [ ] `USER_SESSION_SECRET` set to a long random value.
- [ ] `NEXT_PUBLIC_SITE_URL` = your real `https://` domain, then rebuilt.
- [ ] Log in at `/admin` and confirm the dashboard loads.
- [ ] **Replace the SAMPLE content:** every demo episode points at public
      test streams (Mux / Apple / ExoPlayer). Edit titles in `/admin`
      and swap in your own hosted video URLs (see CONTENT.md), then
      delete sample titles you don't want.
- [ ] Add your first real titles, posters and episodes via `/admin`.
- [ ] Visit `/robots.txt` and `/sitemap.xml` on your domain — both should
      list your real domain name.
- [ ] Set up the backup routine below.

## Backups (5 minutes to set up, saves you someday)

Two things are worth backing up — do both weekly (or before every update):

1. **The data volume** (catalogue + accounts):

   ```bash
   docker run --rm -v watchdrama-data:/data -v "$PWD":/backup alpine \
     tar czf /backup/watchdrama-data-$(date +%F).tar.gz -C /data .
   ```

2. **The catalogue JSON** (from the app itself — easier to restore into a
   fresh install): log in at `/admin` → **Export**, save the file.

Copy the backups OFF the server (Google Drive, your PC) — a backup that
only exists on the same VPS is not a backup.

## Updating the site later

```bash
cd watch-drama
git pull                       # or copy the new project files over
docker compose up -d --build   # rebuilds the app; your data volume is untouched
curl http://localhost:3000/api/health
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Server log shows SECURITY WARNING about `admin123` | `ADMIN_PASSWORD` missing from `.env` → set it, then `docker compose up -d` |
| Admin edits disappear after redeploy | Data volume not mounted — check `docker compose config` shows the `watchdrama-data` volume and `DATA_DIR=/app/data-persist` |
| Site works on `http://IP:3000` but domain shows a Caddy/Nginx error | DNS not propagated yet, or the proxy config has a typo → `sudo systemctl status caddy` / `sudo nginx -t` |
| Wrong domain inside page `<title>`/social previews | `NEXT_PUBLIC_SITE_URL` was wrong at build time → fix `.env`, `docker compose up -d --build` |
| Port 3000 already in use | Something else on the VPS uses it → change the left side of the mapping in `docker-compose.yml` (`"8080:3000"`) and point the proxy at 8080 |
