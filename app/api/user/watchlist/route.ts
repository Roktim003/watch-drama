import { NextResponse } from "next/server";
import { requireUserApi, unknownSlugError } from "@/lib/user-guard";
import { toggleUserSlug, updateUserLists } from "@/lib/users";

// Design (also documented in README): PUT replaces the whole list with
// { slugs: string[] } (used by the guest→account merge); POST toggles one
// title with { slug } (used by the My List buttons).

function cleanSlugs(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const slugs = input.filter((s): s is string => typeof s === "string" && s.length > 0);
  return [...new Set(slugs)];
}

export async function PUT(request: Request) {
  const { user, denied } = await requireUserApi();
  if (denied) return denied;
  let body: { slugs?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const slugs = cleanSlugs(body.slugs);
  if (!slugs) {
    return NextResponse.json({ error: "Expected { slugs: string[] }" }, { status: 400 });
  }
  const err = await unknownSlugError(slugs);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const updated = await updateUserLists(user.id, { watchlist: slugs });
  return NextResponse.json({ watchlist: updated.watchlist });
}

export async function POST(request: Request) {
  const { user, denied } = await requireUserApi();
  if (denied) return denied;
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const slug = body.slug ?? "";
  const err = await unknownSlugError([slug]);
  if (!slug || err) {
    return NextResponse.json({ error: err ?? "Slug is required" }, { status: 400 });
  }
  const watchlist = await toggleUserSlug(user.id, "watchlist", slug);
  return NextResponse.json({ watchlist, inList: watchlist.includes(slug) });
}
