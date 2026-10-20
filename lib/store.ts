// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — server-side catalogue store (Phase 2).
//
// The catalogue lives in `data/catalog.json` in the project root. On first
// run (file missing) it is seeded from the Phase 1 sample catalogue in
// lib/catalog.ts (TITLES). All public pages and the admin panel read/write
// through this module — never import it from client components.
//
// Writes are "atomic-ish": serialize to a temp file in the same directory,
// then rename over the target, so a crash mid-write can't corrupt the file.
// Writes are also funnelled through a small promise chain so concurrent
// requests in this process can't interleave. This is a single-process,
// single-admin store — it is NOT safe for multi-instance deployments
// (two servers sharing one file). For that, move to a real database.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import { TITLES, type Title } from "./catalog";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "catalog.json");

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
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${DATA_FILE}.tmp-${process.pid}`;
    await fs.writeFile(tmp, JSON.stringify(TITLES, null, 2) + "\n", "utf8");
    await fs.rename(tmp, DATA_FILE);
    cache = null;
  }
}

/** Read all titles (cached by file mtime; invalidated on write). */
export async function getTitles(): Promise<Title[]> {
  await ensureSeeded();
  const stat = await fs.stat(DATA_FILE);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.titles;
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const titles: Title[] = Array.isArray(parsed) ? parsed : parsed.titles;
  if (!Array.isArray(titles)) {
    throw new Error("data/catalog.json is corrupted: expected an array of titles");
  }
  cache = { titles, mtimeMs: stat.mtimeMs };
  return titles;
}

export async function getTitle(slug: string): Promise<Title | undefined> {
  const titles = await getTitles();
  return titles.find((t) => t.slug === slug);
}

async function persist(titles: Title[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
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
  return mutate(async (titles) => {
    if (titles.some((t) => t.slug === title.slug)) {
      throw new StoreError(`A title with slug "${title.slug}" already exists`);
    }
    titles.push(title);
    return { titles, result: title };
  });
}

export async function updateTitle(slug: string, title: Title): Promise<Title> {
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
  return mutate(async (titles) => {
    const idx = titles.findIndex((t) => t.slug === slug);
    if (idx === -1) throw new StoreError(`Title "${slug}" not found`, 404);
    titles.splice(idx, 1);
    return { titles, result: undefined };
  });
}

/** Replace the whole catalogue (used by import). */
export async function replaceTitles(titles: Title[]): Promise<void> {
  return mutate(async () => ({ titles, result: undefined }));
}

export class StoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
