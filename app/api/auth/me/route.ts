import { NextResponse } from "next/server";
import { getCurrentPublicUser } from "@/lib/userAuth";

export async function GET() {
  const user = await getCurrentPublicUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
