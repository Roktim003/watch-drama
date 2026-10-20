import { NextResponse } from "next/server";
import { getTitles } from "@/lib/store";
import { requireAdminApi } from "@/lib/admin-guard";

export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const titles = await getTitles();
  const payload = {
    app: "watchdrama-catalog",
    version: 1,
    exportedAt: new Date().toISOString(),
    titles,
  };
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="watchdrama-catalog.json"',
    },
  });
}
