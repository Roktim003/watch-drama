import { NextResponse } from "next/server";
import { createTitle, getTitles, StoreError } from "@/lib/store";
import { validateTitle } from "@/lib/validate";
import { requireAdminApi } from "@/lib/admin-guard";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const titles = await getTitles();
  return NextResponse.json({ titles });
}

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const existing = new Set((await getTitles()).map((t) => t.slug));
  const { title, errors } = validateTitle(body, existing);
  if (errors.length > 0 || !title) {
    return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  }
  try {
    const created = await createTitle(title);
    return NextResponse.json({ title: created }, { status: 201 });
  } catch (e) {
    if (e instanceof StoreError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
