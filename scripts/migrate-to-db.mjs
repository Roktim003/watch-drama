// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — one-shot file → Postgres migration (Phase 4B).
//
//   DATABASE_URL=postgres://… npm run db:migrate
//
// Creates the wd_titles / wd_users tables (same schema the app uses),
// upserts every title from data/catalog.json and every user from
// data/users.json, then reads the tables back and prints before/after
// counts so you can see the data landed.
//
// You only need this when moving EXISTING file data into the database.
// A brand-new empty database needs no migration: the app seeds it with
// the sample catalogue on first request automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Set it to your Postgres connection string first, e.g.:\n" +
      "  DATABASE_URL=postgres://user:password@host:5432/dbname npm run db:migrate"
  );
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function readJson(file, fallback) {
  try {
    const parsed = JSON.parse(await readFile(path.join(root, "data", file), "utf8"));
    const arr = Array.isArray(parsed) ? parsed : parsed.titles ?? parsed.users;
    return Array.isArray(arr) ? arr : fallback;
  } catch {
    return fallback;
  }
}

function needsSsl(u) {
  try {
    const parsed = new URL(u);
    return parsed.hostname.includes("neon.tech") || parsed.searchParams.get("sslmode") === "require";
  } catch {
    return /neon\.tech/.test(u) || /sslmode=require/.test(u);
  }
}

const client = new pg.Client({
  connectionString: url,
  ssl: needsSsl(url) ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS wd_titles (
      slug text PRIMARY KEY,
      doc jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS wd_users (
      id text PRIMARY KEY,
      email text UNIQUE NOT NULL,
      doc jsonb NOT NULL,
      updated_at timestamptz DEFAULT now()
    )`);

  const before = await client.query(
    "SELECT (SELECT COUNT(*) FROM wd_titles) AS titles, (SELECT COUNT(*) FROM wd_users) AS users"
  );
  console.log(`Before: ${before.rows[0].titles} titles, ${before.rows[0].users} users in the database.`);

  const titles = await readJson("catalog.json", []);
  const users = await readJson("users.json", []);
  console.log(`Source files: ${titles.length} titles, ${users.length} users.`);

  for (const t of titles) {
    await client.query(
      `INSERT INTO wd_titles (slug, doc) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET doc = EXCLUDED.doc, updated_at = now()`,
      [t.slug, JSON.stringify(t)]
    );
  }
  for (const u of users) {
    await client.query(
      `INSERT INTO wd_users (id, email, doc) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, doc = EXCLUDED.doc, updated_at = now()`,
      [u.id, u.email, JSON.stringify(u)]
    );
  }

  // Verify by reading back.
  const after = await client.query(
    "SELECT (SELECT COUNT(*) FROM wd_titles) AS titles, (SELECT COUNT(*) FROM wd_users) AS users"
  );
  const titleRows = await client.query("SELECT slug FROM wd_titles");
  const missing = titles.filter((t) => !titleRows.rows.some((r) => r.slug === t.slug));
  console.log(`After: ${after.rows[0].titles} titles, ${after.rows[0].users} users in the database.`);
  if (missing.length) {
    console.error(`Verification FAILED: ${missing.length} title(s) missing after upsert: ${missing.map((t) => t.slug).join(", ")}`);
    process.exitCode = 1;
  } else {
    console.log("Verification OK: every source title is present in wd_titles.");
  }
} finally {
  await client.end().catch(() => {});
}
