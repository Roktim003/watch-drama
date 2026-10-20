import { NextResponse } from "next/server";
import { requireUserApi, unknownSlugError } from "@/lib/user-guard";
import { toggleUserSlug, updateUserLists } from "@/lib/users";

// Same design as /api/user/watchlist: PUT replaces the whole bookings list
// with { slugs: string[] }; POST toggles one title with { slug }.

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
  const updated = await updateUserLists(user.id, { bookings: slugs });
  return NextResponse.json({ bookings: updated.bookings });
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
  const bookings = await toggleUserSlug(user.id, "bookings", slug);
  return NextResponse.json({ bookings, booked: bookings.includes(slug) });
}
