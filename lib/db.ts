// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — Postgres access (Phase 4B, for Vercel deployment).
//
// DUAL-MODE STORAGE
//   • DATABASE_URL set   → Postgres mode. The two stores (lib/store.ts,
//                          lib/users.ts) read/write tables in Postgres
//                          instead of the JSON files. Vercel serverless
//                          filesystems are ephemeral, so this is the mode
//                          a Vercel deployment must run.
//   • DATABASE_URL unset → file mode. Everything behaves exactly as
//                          Phases 2–4 (JSON files under DATA_DIR / ./data).
//
// The pool is created lazily on first use and cached on globalThis so
// Next.js dev HMR and serverless invocations reuse one pool per process.
// Schema is document-style: each table holds one JSONB doc per record
// (the full Title / User object). lib/catalog.ts types and the User
// record shape remain the source of truth — the DB is just storage.
// ─────────────────────────────────────────────────────────────────────────────

import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { TITLES, type Title } from "./catalog";
import type { User } from "./users-types";

// ── Schema (document-store style) ────────────────────────────────────────────
export const wdTitles = pgTable("wd_titles", {
  slug: text("slug").primaryKey(),
  doc: jsonb("doc").$type<Title>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const wdUsers = pgTable("wd_users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  doc: jsonb("doc").$type<User>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const schema = { wdTitles, wdUsers };

// ── Mode + pool ──────────────────────────────────────────────────────────────
export function isDbMode(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

const globalForDb = globalThis as unknown as {
  __wdPool?: Pool;
  __wdDb?: NodePgDatabase<typeof schema>;
  __wdSchemaReady?: Promise<void>;
};

function needsSsl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname.includes("neon.tech") || u.searchParams.get("sslmode") === "require";
  } catch {
    return /neon\.tech/.test(url) || /sslmode=require/.test(url);
  }
}

export function getPool(): Pool {
  if (!globalForDb.__wdPool) {
    const url = process.env.DATABASE_URL as string;
    globalForDb.__wdPool = new Pool({
      connectionString: url,
      ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
      // Serverless-friendly: a small pool per instance; Neon/Postgres
      // absorbs the fan-out. Long-lived servers are unaffected.
      max: 5,
    });
  }
  return globalForDb.__wdPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__wdDb) {
    globalForDb.__wdDb = drizzle(getPool(), { schema });
  }
  return globalForDb.__wdDb;
}

// ── Bootstrap: schema + first-run seed ───────────────────────────────────────
// Runs once per process (single in-flight promise, so concurrent first
// requests can't race the CREATE TABLE / seed).
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__wdSchemaReady) {
    globalForDb.__wdSchemaReady = (async () => {
      const pool = getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wd_titles (
          slug text PRIMARY KEY,
          doc jsonb NOT NULL,
          updated_at timestamptz DEFAULT now()
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wd_users (
          id text PRIMARY KEY,
          email text UNIQUE NOT NULL,
          doc jsonb NOT NULL,
          updated_at timestamptz DEFAULT now()
        )`);
      await seedTitlesIfEmpty();
    })().catch((e) => {
      // Don't cache a rejected promise — let the next request retry.
      globalForDb.__wdSchemaReady = undefined;
      throw e;
    });
  }
  return globalForDb.__wdSchemaReady;
}

/**
 * Seed source for an empty DB: the same defaults file mode uses — the
 * bundled data/catalog.json shipped with the app, falling back to the
 * TITLES constants from lib/catalog.ts.
 */
async function loadSeedTitles(): Promise<Title[]> {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const raw = await fs.readFile(path.join(process.cwd(), "data", "catalog.json"), "utf8");
    const parsed = JSON.parse(raw);
    const titles: Title[] = Array.isArray(parsed) ? parsed : parsed.titles;
    if (Array.isArray(titles) && titles.length) return titles;
  } catch {
    /* fall through to built-in constants */
  }
  return TITLES;
}

async function seedTitlesIfEmpty(): Promise<void> {
  const pool = getPool();
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM wd_titles");
  if (Number(rows[0]?.count ?? 0) > 0) return;
  const seeds = await loadSeedTitles();
  for (const t of seeds) {
    // ON CONFLICT DO NOTHING: safe if two instances seed concurrently.
    await pool.query("INSERT INTO wd_titles (slug, doc) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING", [
      t.slug,
      JSON.stringify(t),
    ]);
  }
}

/**
 * True when an error is a Postgres unique-violation (23505). Drizzle
 * wraps driver errors (DrizzleQueryError.cause → pg error), so walk the
 * cause chain.
 */
export function isUniqueViolation(e: unknown): boolean {
  let cur: unknown = e;
  for (let depth = 0; depth < 5 && typeof cur === "object" && cur !== null; depth++) {
    if ((cur as { code?: string }).code === "23505") return true;
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}
