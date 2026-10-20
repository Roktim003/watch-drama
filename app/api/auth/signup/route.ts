import { NextResponse } from "next/server";
import { createUser, toPublicUser, UserError } from "@/lib/users";
import { createUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const user = await createUser({ name, email, password });
    const res = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
    res.cookies.set(USER_COOKIE, createUserToken(user.id), userCookieOptions);
    return res;
  } catch (e) {
    if (e instanceof UserError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
