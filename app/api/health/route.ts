// WatchDrama — health check (Phase 4).
//
// GET /api/health → 200 { ok, titles, users, uptime }.
// Public on purpose (no auth): used by Docker/uptime monitors and the
// DEPLOY.md verification step. Exposes only aggregate counts — no user
// data, no catalogue contents, no secrets.

import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getTitles } from "@/lib/store";
import { getUsers } from "@/lib/users";

export async function GET() {
  await connection(); // always evaluate live — never serve a cached count
  try {
    const [titles, users] = await Promise.all([getTitles(), getUsers()]);
    return NextResponse.json({
      ok: true,
      titles: titles.length,
      users: users.length,
      uptime: Math.round(process.uptime()),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "health check failed" },
      { status: 500 }
    );
  }
}
