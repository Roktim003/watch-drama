import { NextResponse } from "next/server";
import { getUserByEmail, toPublicUser, verifyPassword } from "@/lib/users";
import { createUserToken, USER_COOKIE, userCookieOptions } from "@/lib/userAuth";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";

  // One generic message — never reveal whether the email or the password
  // was the wrong part.
  const user = email ? await getUserByEmail(email) : undefined;
  if (!user || !verifyPassword(user, password)) {
    return NextResponse.json(
      { error: "Email or password is incorrect" },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ user: toPublicUser(user) });
  res.cookies.set(USER_COOKIE, createUserToken(user.id), userCookieOptions);
  return res;
}
