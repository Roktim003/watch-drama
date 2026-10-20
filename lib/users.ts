// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — viewer user store (Phase 3; dual-mode Phase 4B).
//
// DUAL MODE — same exported interface in both:
//   • DATABASE_URL set   → Postgres (table wd_users, one JSONB doc per
//                          user, unique email enforced by the DB; see
//                          lib/db.ts). This is the Vercel mode.
//   • DATABASE_URL unset → the original JSON file store described below.
//
// FILE MODE: viewer accounts live in `users.json` inside the data
// directory (see lib/dataDir.ts: $DATA_DIR when set, otherwise ./data in
// the project root — Phase 4), using the same JSON-store pattern as the
// catalogue (lib/store.ts): seeded on first run (from the bundled
// users.json shipped with the app, or empty), writes go to a temp file
// then rename over the target, and all mutations are funnelled through a
// promise chain so concurrent requests in this process can't interleave.
//
// Passwords are NEVER stored in plaintext. Each user gets a random salt
// and the stored `passwordHash` is scrypt(password, salt) using Node's
// built-in crypto — no extra dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { bundledDataDir, dataDir, dataFile } from "./dataDir";
import { ensureSchema, getDb, isDbMode, isUniqueViolation, wdUsers } from "./db";
import { eq } from "drizzle-orm";
import type { User, UserProgress } from "./users-types";

export type { User, UserProgress, PublicUser } from "./users-types";
export { toPublicUser } from "./users-types";

const DATA_FILE = dataFile("users.json");

// ── Password hashing (scrypt) ────────────────────────────────────────────────
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string, salt: string): string {
  return scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export function verifyPassword(user: User, candidate: string): boolean {
  const computed = Buffer.from(hashPassword(candidate, user.salt), "hex");
  const stored = Buffer.from(user.passwordHash, "hex");
  if (computed.length !== stored.length) return false;
  return timingSafeEqual(computed, stored);
}

// ── File store ───────────────────────────────────────────────────────────────
interface Cache {
  users: User[];
  mtimeMs: number;
}

let cache: Cache | null = null;
let writeChain: Promise<unknown> = Promise.resolve();

async function ensureSeeded(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(dataDir(), { recursive: true });
    // Seed from the bundled users.json shipped with the app when seeding a
    // fresh DATA_DIR (Phase 4); otherwise start empty, as before.
    const bundled = path.join(bundledDataDir(), "users.json");
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
      await fs.writeFile(tmp, "[]\n", "utf8");
      await fs.rename(tmp, DATA_FILE);
    }
    cache = null;
  }
}

// ── DB mode (Phase 4B) ───────────────────────────────────────────────────────
async function dbGetUsers(): Promise<User[]> {
  await ensureSchema();
  const rows = await getDb().select({ doc: wdUsers.doc }).from(wdUsers);
  return rows.map((r) => r.doc);
}

async function dbGetUserById(id: string): Promise<User | undefined> {
  await ensureSchema();
  const rows = await getDb().select({ doc: wdUsers.doc }).from(wdUsers).where(eq(wdUsers.id, id));
  return rows[0]?.doc;
}

async function dbUpdateUserDoc(user: User): Promise<void> {
  await getDb()
    .update(wdUsers)
    .set({ doc: user, email: user.email, updatedAt: new Date() })
    .where(eq(wdUsers.id, user.id));
}

export async function getUsers(): Promise<User[]> {
  if (isDbMode()) return dbGetUsers();
  await ensureSeeded();
  const stat = await fs.stat(DATA_FILE);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.users;
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const users: User[] = Array.isArray(parsed) ? parsed : parsed.users;
  if (!Array.isArray(users)) {
    throw new Error("users.json is corrupted: expected an array of users");
  }
  cache = { users, mtimeMs: stat.mtimeMs };
  return users;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  if (isDbMode()) {
    await ensureSchema();
    const rows = await getDb()
      .select({ doc: wdUsers.doc })
      .from(wdUsers)
      .where(eq(wdUsers.email, email.toLowerCase()));
    return rows[0]?.doc;
  }
  const users = await getUsers();
  return users.find((u) => u.email === email.toLowerCase());
}

export async function getUserById(id: string): Promise<User | undefined> {
  if (isDbMode()) return dbGetUserById(id);
  const users = await getUsers();
  return users.find((u) => u.id === id);
}

async function persist(users: User[]): Promise<void> {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${DATA_FILE}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(users, null, 2) + "\n", "utf8");
  await fs.rename(tmp, DATA_FILE);
  const stat = await fs.stat(DATA_FILE);
  cache = { users, mtimeMs: stat.mtimeMs };
}

function mutate<T>(fn: (users: User[]) => Promise<{ users: User[]; result: T }>): Promise<T> {
  const run = async (): Promise<T> => {
    const users = await getUsers();
    const { users: next, result } = await fn([...users]);
    await persist(next);
    return result;
  };
  const p = writeChain.then(run, run);
  writeChain = p.catch(() => undefined);
  return p;
}

export class UserError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
function buildUser(input: { name: string; email: string; password: string }): User {
  const salt = newSalt();
  return {
    id: randomUUID(),
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: hashPassword(input.password, salt),
    salt,
    createdAt: new Date().toISOString(),
    watchlist: [],
    bookings: [],
    progress: {},
  };
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const email = input.email.toLowerCase();
  if (isDbMode()) {
    await ensureSchema();
    const user = buildUser(input);
    try {
      await getDb().insert(wdUsers).values({ id: user.id, email: user.email, doc: user });
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new UserError("An account with this email already exists");
      }
      throw e;
    }
    return user;
  }
  return mutate(async (users) => {
    if (users.some((u) => u.email === email)) {
      throw new UserError("An account with this email already exists");
    }
    const salt = newSalt();
    const user: User = {
      id: randomUUID(),
      name: input.name,
      email,
      passwordHash: hashPassword(input.password, salt),
      salt,
      createdAt: new Date().toISOString(),
      watchlist: [],
      bookings: [],
      progress: {},
    };
    users.push(user);
    return { users, result: user };
  });
}

/** Replace a user's lists/progress wholesale (used by the sync APIs). */
export async function updateUserLists(
  id: string,
  patch: Partial<Pick<User, "watchlist" | "bookings" | "progress">>
): Promise<User> {
  if (isDbMode()) {
    const existing = await dbGetUserById(id);
    if (!existing) throw new UserError("User not found", 404);
    const next = { ...existing };
    if (patch.watchlist !== undefined) next.watchlist = [...patch.watchlist];
    if (patch.bookings !== undefined) next.bookings = [...patch.bookings];
    if (patch.progress !== undefined) next.progress = { ...patch.progress };
    await dbUpdateUserDoc(next);
    return next;
  }
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const next = { ...users[idx] };
    if (patch.watchlist !== undefined) next.watchlist = [...patch.watchlist];
    if (patch.bookings !== undefined) next.bookings = [...patch.bookings];
    if (patch.progress !== undefined) next.progress = { ...patch.progress };
    users[idx] = next;
    return { users, result: next };
  });
}

/** Toggle a slug in watchlist/bookings. Returns the resulting list. */
export async function toggleUserSlug(
  id: string,
  field: "watchlist" | "bookings",
  slug: string
): Promise<string[]> {
  if (isDbMode()) {
    const existing = await dbGetUserById(id);
    if (!existing) throw new UserError("User not found", 404);
    const list = [...existing[field]];
    const at = list.indexOf(slug);
    if (at === -1) list.push(slug);
    else list.splice(at, 1);
    await dbUpdateUserDoc({ ...existing, [field]: list });
    return list;
  }
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const list = [...users[idx][field]];
    const at = list.indexOf(slug);
    if (at === -1) list.push(slug);
    else list.splice(at, 1);
    users[idx] = { ...users[idx], [field]: list };
    return { users, result: list };
  });
}

export async function upsertProgress(
  id: string,
  slug: string,
  entry: UserProgress
): Promise<UserProgress> {
  if (isDbMode()) {
    const existing = await dbGetUserById(id);
    if (!existing) throw new UserError("User not found", 404);
    const progress = { ...existing.progress, [slug]: entry };
    await dbUpdateUserDoc({ ...existing, progress });
    return entry;
  }
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const progress = { ...users[idx].progress, [slug]: entry };
    users[idx] = { ...users[idx], progress };
    return { users, result: entry };
  });
}

export async function deleteProgress(id: string, slug: string): Promise<void> {
  if (isDbMode()) {
    const existing = await dbGetUserById(id);
    if (!existing) throw new UserError("User not found", 404);
    const progress = { ...existing.progress };
    delete progress[slug];
    await dbUpdateUserDoc({ ...existing, progress });
    return;
  }
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const progress = { ...users[idx].progress };
    delete progress[slug];
    users[idx] = { ...users[idx], progress };
    return { users, result: undefined };
  });
}
