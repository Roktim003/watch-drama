// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — viewer user store (Phase 3).
//
// Viewer accounts live in `users.json` inside the data directory (see
// lib/dataDir.ts: $DATA_DIR when set, otherwise ./data in the project
// root — Phase 4), using the same JSON-store pattern as the catalogue
// (lib/store.ts): seeded on first run (from the bundled users.json shipped
// with the app, or empty), writes go to a temp file then rename over the
// target, and all mutations are funnelled through a promise chain so
// concurrent requests in this process can't interleave. Single-process
// store — NOT safe for multi-instance deployments; move to a real
// database for that.
//
// Passwords are NEVER stored in plaintext. Each user gets a random salt
// and the stored `passwordHash` is scrypt(password, salt) using Node's
// built-in crypto — no extra dependencies.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs } from "fs";
import path from "path";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { bundledDataDir, dataDir, dataFile } from "./dataDir";

const DATA_FILE = dataFile("users.json");

export interface UserProgress {
  episode: number;
  position: number; // seconds
  duration: number; // seconds
  updatedAt: string; // ISO timestamp
}

export interface User {
  id: string;
  name: string;
  email: string; // stored lowercase, unique
  passwordHash: string;
  salt: string;
  createdAt: string;
  watchlist: string[]; // title slugs
  bookings: string[]; // coming-soon title slugs
  progress: Record<string, UserProgress>; // keyed by title slug (latest episode)
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

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

export async function getUsers(): Promise<User[]> {
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
  const users = await getUsers();
  return users.find((u) => u.email === email.toLowerCase());
}

export async function getUserById(id: string): Promise<User | undefined> {
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
export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const email = input.email.toLowerCase();
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
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const progress = { ...users[idx].progress, [slug]: entry };
    users[idx] = { ...users[idx], progress };
    return { users, result: entry };
  });
}

export async function deleteProgress(id: string, slug: string): Promise<void> {
  return mutate(async (users) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) throw new UserError("User not found", 404);
    const progress = { ...users[idx].progress };
    delete progress[slug];
    users[idx] = { ...users[idx], progress };
    return { users, result: undefined };
  });
}
