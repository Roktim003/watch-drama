import { NextResponse } from "next/server";
import { replaceTitles } from "@/lib/store";
import { validateCatalogue } from "@/lib/validate";
import { requireAdminApi } from "@/lib/admin-guard";

/**
 * Replace the entire catalogue with an uploaded JSON catalogue.
 * Body: the parsed JSON file contents — either an array of titles
 * or an export object { titles: [...] }. Replace-only (the admin UI
 * asks for confirmation first); the whole import is validated before
 * anything is written, so a bad file changes nothing.
 */
export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "File is not valid JSON" }, { status: 400 });
  }
  const { titles, errors } = validateCatalogue(body);
  if (errors.length > 0 || !titles) {
    return NextResponse.json(
      { error: errors[0] ?? "Invalid catalogue", errors },
      { status: 400 }
    );
  }
  await replaceTitles(titles);
  return NextResponse.json({ ok: true, count: titles.length });
}
