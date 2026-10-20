import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/user-guard";

export async function GET() {
  const { user, denied } = await requireUserApi();
  if (denied) return denied;
  return NextResponse.json({
    watchlist: user.watchlist,
    bookings: user.bookings,
    progress: user.progress,
  });
}
