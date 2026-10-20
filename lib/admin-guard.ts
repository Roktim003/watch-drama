import { NextResponse } from "next/server";
import { isAuthenticated } from "./auth";

/** For admin API route handlers: returns a 401 response, or null if OK. */
export async function requireAdminApi(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json({ error: "Not logged in" }, { status: 401 });
}
