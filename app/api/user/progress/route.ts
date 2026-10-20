import { NextResponse } from "next/server";
import { requireUserApi, unknownSlugError } from "@/lib/user-guard";
import { deleteProgress, upsertProgress, type UserProgress } from "@/lib/users";

// POST upserts one title's progress: { slug, episode, position, duration }.
// The server stamps updatedAt itself so clients can't forge recency.
// DELETE removes one entry: { slug }.

export async function POST(request: Request) {
  const { user, denied } = await requireUserApi();
  if (denied) return denied;
  let body: { slug?: string; episode?: number; position?: number; duration?: number };
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
  const episode = Number(body.episode);
  const position = Number(body.position);
  const duration = Number(body.duration);
  if (!Number.isFinite(episode) || episode < 1) {
    return NextResponse.json({ error: "episode must be a positive number" }, { status: 400 });
  }
  if (!Number.isFinite(position) || position < 0 || !Number.isFinite(duration) || duration < 0) {
    return NextResponse.json(
      { error: "position and duration must be non-negative numbers" },
      { status: 400 }
    );
  }
  const entry: UserProgress = {
    episode: Math.floor(episode),
    position,
    duration,
    updatedAt: new Date().toISOString(),
  };
  const saved = await upsertProgress(user.id, slug, entry);
  return NextResponse.json({ progress: saved });
}

export async function DELETE(request: Request) {
  const { user, denied } = await requireUserApi();
  if (denied) return denied;
  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const slug = body.slug ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }
  await deleteProgress(user.id, slug);
  return NextResponse.json({ ok: true });
}
