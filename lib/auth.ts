// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — single-admin authentication (Phase 2).
//
// One admin password, from the ADMIN_PASSWORD env var. If it is not set,
// the development default "admin123" is used and `isUsingDevPassword()`
// returns true so the admin UI can show a loud warning — set a real
// password in .env.local before deploying (see .env.example).
//
// Session: an httpOnly cookie whose value is HMAC-SHA256(password, fixed
// label). It is unguessable without knowing the password, carries no data,
// and changing the password invalidates all sessions. There is no user
// table and no multi-admin support — by design for Phase 2.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "wd_admin";
const SESSION_LABEL = "watchdrama-admin-session-v1";
const DEV_PASSWORD = "admin123";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEV_PASSWORD;
}

export function isUsingDevPassword(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

export function sessionToken(): string {
  return createHmac("sha256", adminPassword()).update(SESSION_LABEL).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function checkPassword(candidate: string): boolean {
  return safeEqual(candidate, adminPassword());
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  const value = jar.get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  return safeEqual(value, sessionToken());
}

/** Cookie options used when setting/clearing the session cookie. */
export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  secure: process.env.NODE_ENV === "production",
};
