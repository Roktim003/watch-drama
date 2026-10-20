# ─────────────────────────────────────────────────────────────────────────────
# WatchDrama — production Docker image (Phase 4).
#
# Multi-stage build:
#   deps    → install dependencies from the lockfile
#   builder → build the app (Next standalone output)
#   runner  → slim image with only the standalone server + assets
#
# Run it (with docker-compose — see docker-compose.yml / DEPLOY.md):
#   docker compose up -d
#
# Data: the app reads/writes catalog.json + users.json in $DATA_DIR.
# The compose file mounts a named volume at /app/data-persist so the
# data survives rebuilds and redeploys. The repo's own data/ folder is
# copied to /app/data and used ONLY to seed a fresh volume on first run.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

# ── Dependencies ─────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Build ────────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_SITE_URL is baked into page metadata at build time — pass
# your real domain when building, e.g.
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://example.com .
# It can also be overridden at runtime for robots/sitemap where Next
# evaluates them per request, but rebuilding with the right value is
# the clean setup (see DEPLOY.md).
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Live data lives here — mount a volume at this path (compose does).
ENV DATA_DIR=/app/data-persist

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/data-persist \
  && chown nextjs:nodejs /app/data-persist

# Static assets + the standalone server (includes its own node_modules).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Bundled seed defaults (used once, when DATA_DIR is empty).
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

USER nextjs
EXPOSE 3000

# Same production start the standalone build produces; `npm run start`
# in a plain checkout is the equivalent non-Docker command.
CMD ["node", "server.js"]
