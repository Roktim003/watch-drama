// ─────────────────────────────────────────────────────────────────────────────
// WatchDrama — viewer session auth (Phase 3). SEPARATE from the admin auth
// in lib/auth.ts: different cookie (`wd_user` vs `wd_admin`), different
// secret, and admin behavior is untouched.
//
// Session: an httpOnly cookie carrying a small signed payload:
//   base64url(JSON { uid, exp }) + "." + HMAC-SHA256(secret, payload)
// The token is unguessable/untamperable without the secret and expires
// after 30 days. The signing secret is USER_SESSION_SECRET if set, else
// the ADMIN_PASSWORD, else a development constant (fine locally; set a
// real USER_SESSION_SECRET before deploying). proxy.ts verifies the same
// token format to protect /my-list — keep the two in sync.
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getUserById, type PublicUser, type User, toPublicUser } from "./users";

export const USER_COOKIE = "wd_user";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function userSessionSecret(): string {
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    "watchdrama-user-session-dev-secret-v1"
  );
}

function sign(payloadB64: string): string {
  return createHmac("sha256", userSessionSecret()).update(payloadB64).digest("base64url");
}

export function createUserToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + SESSION_TTL_MS }),
    "utf8"
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verify a token value; returns the user id or null. Shared shape with proxy.ts. */
export function verifyUserToken(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || Date.now() > data.exp) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  return verifyUserToken(jar.get(USER_COOKIE)?.value);
}

export async function getCurrentUser(): Promise<User | null> {
  const id = await getSessionUserId();
  if (!id) return null;
  return (await getUserById(id)) ?? null;
}

export async function getCurrentPublicUser(): Promise<PublicUser | null> {
  const user = await getCurrentUser();
  return user ? toPublicUser(user) : null;
}

/** Cookie options used when setting/clearing the user session cookie. */
export const userCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  secure: process.env.NODE_ENV === "production",
};
