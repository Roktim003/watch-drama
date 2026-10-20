import { NextResponse } from "next/server";
import { USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(USER_COOKIE, "", { ...userCookieOptions, maxAge: 0 });
  return res;
}
