import { NextResponse, type NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { readFileSync, statSync } from "fs";
import path from "path";

// Route protection for /admin pages and /api/admin APIs (Phase 2).
// Runs BEFORE rendering, so unauthenticated requests are rejected with a
// real redirect/401 and no admin content is ever streamed to them.
// (The (panel) layout also checks, as defense in depth.)
//
// Token = HMAC-SHA256(admin password, label), same as lib/auth.ts — kept
// in sync manually; the proxy runs outside the app module graph.
const ADMIN_COOKIE = "wd_admin";
const SESSION_LABEL = "watchdrama-admin-session-v1";
const DEV_PASSWORD = "admin123";

function expectedToken(): string {
  const password = process.env.ADMIN_PASSWORD || DEV_PASSWORD;
  return createHmac("sha256", password).update(SESSION_LABEL).digest("hex");
}

function isAuthed(request: NextRequest): boolean {
  const value = request.cookies.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const expected = expectedToken();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── Viewer session check for /my-list (Phase 3) ─────────────────────────────
// Same token format as lib/userAuth.ts: base64url(JSON {uid, exp}) + "." +
// HMAC-SHA256(secret, payload). Verified here, BEFORE rendering, so no
// user data is ever streamed to a logged-out visitor (the Phase 2 lesson).
const USER_COOKIE = "wd_user";

function userSessionSecret(): string {
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "watchdrama-user-session-dev-secret-v1"
  );
}

function hasValidUserSession(request: NextRequest): boolean {
  const value = request.cookies.get(USER_COOKIE)?.value;
  if (!value) return false;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = createHmac("sha256", userSessionSecret())
    .update(payload)
    .digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      exp?: number;
    };
    return !!data.uid && !!data.exp && Date.now() <= data.exp;
  } catch {
    return false;
  }
}

// ── Real 404s for title/watch pages ─────────────────────────────────────────
// With Cache Components (PPR), a notFound() thrown inside a streamed page
// is served with HTTP 200. To give missing titles a true 404 status, the
// proxy checks the slug against data/catalog.json up front and rewrites
// unknown ones to an unmatched path (which Next serves as a real 404).
let slugCache: {
  mtimeMs: number;
  episodesBySlug: Map<string, Set<number>>;
} | null = null;
function catalogueIndex(): Map<string, Set<number>> | null {
  try {
    const file = path.join(process.cwd(), "data", "catalog.json");
    const stat = statSync(file);
    if (slugCache && slugCache.mtimeMs === stat.mtimeMs) return slugCache.episodesBySlug;
    const titles = JSON.parse(readFileSync(file, "utf8")) as Array<{
      slug: string;
      seasons: Array<{ episodes: Array<{ number: number }> }>;
    }>;
    const map = new Map<string, Set<number>>();
    for (const t of titles) {
      const eps = new Set<number>();
      for (const s of t.seasons ?? []) for (const e of s.episodes ?? []) eps.add(e.number);
      map.set(t.slug, eps);
    }
    slugCache = { mtimeMs: stat.mtimeMs, episodesBySlug: map };
    return map;
  } catch {
    return null; // store unreadable → let the page handle it
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPage = pathname.match(/^\/(title|watch)\/([^/]+)(?:\/([^/]+))?/);
  if (publicPage) {
    const index = catalogueIndex();
    const slug = decodeURIComponent(publicPage[2]);
    const episodes = index?.get(slug);
    const badEpisode =
      publicPage[1] === "watch" &&
      publicPage[3] !== undefined &&
      episodes !== undefined &&
      !episodes.has(Number.parseInt(publicPage[3], 10));
    if (index && (episodes === undefined || badEpisode)) {
      const url = request.nextUrl.clone();
      url.pathname = "/__missing-title__";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // /my-list is a viewer page (Phase 3): valid user session or a clean
  // redirect to /login — returned before anything renders, so the body
  // contains zero user data.
  if (pathname === "/my-list" || pathname.startsWith("/my-list/")) {
    if (hasValidUserSession(request)) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?next=/my-list";
    return NextResponse.redirect(url);
  }

  // Login/logout endpoints and the login page stay reachable.
  if (
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout" ||
    pathname === "/admin/login"
  ) {
    return NextResponse.next();
  }
  if (isAuthed(request)) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/title/:path*",
    "/watch/:path*",
    "/my-list",
    "/my-list/:path*",
  ],
};
