// Seed / migration script (Phase 2):
// Generates data/catalog.json from the Phase 1 sample catalogue in
// lib/catalog.ts (TITLES). Run with:  node scripts/seed-catalog.mjs
// Refuses to overwrite an existing data/catalog.json unless --force is
// passed, so re-running it can't wipe admin edits.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const out = path.join(root, "data", "catalog.json");

if (existsSync(out) && !process.argv.includes("--force")) {
  console.log(`data/catalog.json already exists — pass --force to overwrite.`);
  process.exit(0);
}

const source = readFileSync(path.join(root, "lib", "catalog.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const mod = { exports: {} };
new Function("module", "exports", outputText)(mod, mod.exports);
const titles = mod.exports.TITLES;
if (!Array.isArray(titles)) throw new Error("TITLES not found in lib/catalog.ts");

mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(titles, null, 2) + "\n", "utf8");
console.log(`Seeded ${titles.length} titles -> ${out}`);
