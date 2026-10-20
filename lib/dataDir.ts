// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — data directory resolution (Phase 4).
//
// Single source of truth for WHERE the JSON stores live:
//
//   • DATA_DIR set   → catalog.json + users.json live in that directory.
//                      This is what Docker volumes / a VPS folder point at,
//                      so data survives restarts and redeploys.
//   • DATA_DIR unset → ./data in the project root (Phases 2–3 behavior,
//                      unchanged for local development).
//
// When the live directory does NOT yet contain a store file, the store
// modules seed it from the bundled defaults (see bundledDataDir below):
// the `data/` folder shipped with the project / Docker image.
// ─────────────────────────────────────────────────────────────────────────────

import path from "path";

/** Directory the live JSON stores are read from / written to. */
export function dataDir(): string {
  const env = process.env.DATA_DIR?.trim();
  return env ? path.resolve(env) : path.join(process.cwd(), "data");
}

/** Full path of a store file inside the live data directory. */
export function dataFile(name: string): string {
  return path.join(dataDir(), name);
}

/**
 * Directory holding the bundled seed defaults shipped with the app
 * (the repo's own `data/` folder). Only used to seed a fresh DATA_DIR —
 * never read from once the live files exist.
 */
export function bundledDataDir(): string {
  return path.join(process.cwd(), "data");
}
