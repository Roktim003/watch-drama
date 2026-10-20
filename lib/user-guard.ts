import { NextResponse } from "next/server";
import { getCurrentUser } from "./userAuth";
import type { User } from "./users";

/** For user sync API route handlers: returns { user } or a 401 response. */
export async function requireUserApi(): Promise<
  { user: User; denied: null } | { user: null; denied: NextResponse }
> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      denied: NextResponse.json({ error: "Not logged in" }, { status: 401 }),
    };
  }
  return { user, denied: null };
}

/** Validate that every slug exists in the catalogue. Returns an error message or null. */
export async function unknownSlugError(slugs: string[]): Promise<string | null> {
  const { getTitles } = await import("./store");
  const known = new Set((await getTitles()).map((t) => t.slug));
  const bad = slugs.filter((s) => !known.has(s));
  return bad.length > 0 ? `Unknown title: ${bad.join(", ")}` : null;
}
