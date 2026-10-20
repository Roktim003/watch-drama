import { NextResponse } from "next/server";
import { deleteTitle, getTitle, getTitles, updateTitle, StoreError } from "@/lib/store";
import { validateTitle } from "@/lib/validate";
import { requireAdminApi } from "@/lib/admin-guard";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const title = await getTitle(slug);
  if (!title) return NextResponse.json({ error: "Title not found" }, { status: 404 });
  return NextResponse.json({ title });
}

export async function PUT(request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const existing = new Set((await getTitles()).map((t) => t.slug));
  if (!existing.has(slug)) {
    return NextResponse.json({ error: "Title not found" }, { status: 404 });
  }
  const { title, errors } = validateTitle(body, existing, slug);
  if (errors.length > 0 || !title) {
    return NextResponse.json({ error: errors.join("; "), errors }, { status: 400 });
  }
  try {
    const updated = await updateTitle(slug, title);
    return NextResponse.json({ title: updated });
  } catch (e) {
    if (e instanceof StoreError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  try {
    await deleteTitle(slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof StoreError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
