// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — server-side catalogue store (Phase 2; dual-mode Phase 4B).
//
// DUAL MODE — same exported interface in both:
//   • DATABASE_URL set   → Postgres (table wd_titles, one JSONB doc per
//                          title; see lib/db.ts). No file access, no cache:
//                          reads are direct queries, uniqueness is enforced
//                          by the primary key. This is the Vercel mode.
//   • DATABASE_URL unset → the original JSON file store described below.
//
// FILE MODE: the catalogue lives in `catalog.json` inside the data
// directory (see lib/dataDir.ts: $DATA_DIR when set, otherwise ./data in
// the project root — Phase 4). On first run (file missing) it is seeded
// from the bundled defaults shipped with the app (the repo's
// data/catalog.json, which mirrors the Phase 1 sample catalogue in
// lib/catalog.ts), falling back to TITLES directly. All public pages and
// the admin panel read/write through this module — never import it from
// client components. Writes are "atomic-ish": serialize to a temp file in
// the same directory, then rename over the target, so a crash mid-write
// can't corrupt the file. Writes are also funnelled through a small
// promise chain so concurrent requests in this process can't interleave.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import { TITLES, type Title } from "./catalog";
import { bundledDataDir, dataDir, dataFile } from "./dataDir";
import { ensureSchema, getDb, isDbMode, isUniqueViolation, wdTitles } from "./db";
import { eq } from "drizzle-orm";

const DATA_FILE = dataFile("catalog.json");

interface Cache {
  titles: Title[];
  mtimeMs: number;
}

let cache: Cache | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

async function ensureSeeded(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(dataDir(), { recursive: true });
    // Prefer the bundled seed file shipped with the app (Phase 4: this is
    // how a fresh Docker volume / DATA_DIR gets the default catalogue).
    // When DATA_DIR is unset, DATA_FILE *is* the bundled file, so the copy
    // is skipped and we fall through to the TITLES constant as before.
    const bundled = path.join(bundledDataDir(), "catalog.json");
    let seeded = false;
    if (bundled !== DATA_FILE) {
      try {
        await fs.copyFile(bundled, DATA_FILE);
        seeded = true;
      } catch {
        seeded = false;
      }
    }
    if (!seeded) {
      const tmp = `${DATA_FILE}.tmp-${process.pid}`;
      await fs.writeFile(tmp, JSON.stringify(TITLES, null, 2) + "\n", "utf8");
      await fs.rename(tmp, DATA_FILE);
    }
    cache = null;
  }
}

// ── DB mode (Phase 4B) ───────────────────────────────────────────────────────
const SEED_ORDER = new Map(TITLES.map((t, i) => [t.slug, i]));

async function dbGetTitles(): Promise<Title[]> {
  await ensureSchema();
  const rows = await getDb().select({ doc: wdTitles.doc }).from(wdTitles);
  const titles = rows.map((r) => r.doc);
  // File mode preserves insertion order and pages present rows in store
  // order, so DB mode reproduces it for the seeded catalogue (seed index),
  // with later/admin titles after, ordered by slug. Deterministic and —
  // for the shipped catalogue — identical to file mode.
  titles.sort((a, b) => {
    const ia = SEED_ORDER.get(a.slug) ?? Number.POSITIVE_INFINITY;
    const ib = SEED_ORDER.get(b.slug) ?? Number.POSITIVE_INFINITY;
    return ia !== ib ? ia - ib : a.slug.localeCompare(b.slug);
  });
  return titles;
}

async function dbGetTitle(slug: string): Promise<Title | undefined> {
  await ensureSchema();
  const rows = await getDb().select({ doc: wdTitles.doc }).from(wdTitles).where(eq(wdTitles.slug, slug));
  return rows[0]?.doc;
}

/** Read all titles (file mode: cached by file mtime; DB mode: direct query). */
export async function getTitles(): Promise<Title[]> {
  if (isDbMode()) return dbGetTitles();
  await ensureSeeded();
  const stat = await fs.stat(DATA_FILE);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.titles;
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const titles: Title[] = Array.isArray(parsed) ? parsed : parsed.titles;
  if (!Array.isArray(titles)) {
    throw new Error("catalog.json is corrupted: expected an array of titles");
  }
  cache = { titles, mtimeMs: stat.mtimeMs };
  return titles;
}

export async function getTitle(slug: string): Promise<Title | undefined> {
  if (isDbMode()) return dbGetTitle(slug);
  const titles = await getTitles();
  return titles.find((t) => t.slug === slug);
}

async function persist(titles: Title[]): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${DATA_FILE}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(titles, null, 2) + "\n", "utf8");
  await fs.rename(tmp, DATA_FILE);
  const stat = await fs.stat(DATA_FILE);
  cache = { titles, mtimeMs: stat.mtimeMs };
}

/** Run a mutation serialized against other writes in this process. */
function mutate<T>(fn: (titles: Title[]) => Promise<{ titles: Title[]; result: T }>): Promise<T> {
  const run = async (): Promise<T> => {
    const titles = await getTitles();
    const { titles: next, result } = await fn([...titles]);
    await persist(next);
    return result;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => undefined);
  return p;
}

export async function createTitle(title: Title): Promise<Title> {
  if (isDbMode()) {
    await ensureSchema();
    try {
      await getDb().insert(wdTitles).values({ slug: title.slug, doc: title });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new StoreError(`A title with slug "${title.slug}" already exists`);
      }
      throw e;
    }
    return title;
  }
  return mutate(async (titles) => {
    if (titles.some((t) => t.slug === title.slug)) {
      throw new StoreError(`A title with slug "${title.slug}" already exists`);
    }
    titles.push(title);
    return { titles, result: title };
  });
}

export async function updateTitle(slug: string, title: Title): Promise<Title> {
  if (isDbMode()) {
    await ensureSchema();
    const db = getDb();
    const existing = await dbGetTitle(slug);
    if (!existing) throw new StoreError(`Title "${slug}" not found`, 404);
    if (title.slug !== slug && (await dbGetTitle(title.slug))) {
      throw new StoreError(`A title with slug "${title.slug}" already exists`);
    }
    try {
      // Update in place when the slug is unchanged; re-key (delete+insert)
      // when the admin renamed the slug.
      if (title.slug === slug) {
        await db
          .update(wdTitles)
          .set({ doc: title, updatedAt: new Date() })
          .where(eq(wdTitles.slug, slug));
      } else {
        await db.delete(wdTitles).where(eq(wdTitles.slug, slug));
        await db.insert(wdTitles).values({ slug: title.slug, doc: title });
      }
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new StoreError(`A title with slug "${title.slug}" already exists`);
      }
      throw e;
    }
    return title;
  }
  return mutate(async (titles) => {
    const idx = titles.findIndex((t) => t.slug === slug);
    if (idx === -1) throw new StoreError(`Title "${slug}" not found`, 404);
    if (title.slug !== slug && titles.some((t) => t.slug === title.slug)) {
      throw new StoreError(`A title with slug "${title.slug}" already exists`);
    }
    titles[idx] = title;
    return { titles, result: title };
  });
}

export async function deleteTitle(slug: string): Promise<void> {
  if (isDbMode()) {
    await ensureSchema();
    const deleted = await getDb()
      .delete(wdTitles)
      .where(eq(wdTitles.slug, slug))
      .returning({ slug: wdTitles.slug });
    if (!deleted.length) throw new StoreError(`Title "${slug}" not found`, 404);
    return;
  }
  return mutate(async (titles) => {
    const idx = titles.findIndex((t) => t.slug === slug);
    if (idx === -1) throw new StoreError(`Title "${slug}" not found`, 404);
    titles.splice(idx, 1);
    return { titles, result: undefined };
  });
}

/** Replace the whole catalogue (used by import). */
export async function replaceTitles(titles: Title[]): Promise<void> {
  if (isDbMode()) {
    await ensureSchema();
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.delete(wdTitles);
      for (const t of titles) {
        await tx.insert(wdTitles).values({ slug: t.slug, doc: t });
      }
    });
    // Match file-mode ordering for the imported set.
    SEED_ORDER.clear();
    titles.forEach((t, i) => SEED_ORDER.set(t.slug, i));
    return;
  }
  return mutate(async () => ({ titles, result: undefined }));
}

export class StoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
