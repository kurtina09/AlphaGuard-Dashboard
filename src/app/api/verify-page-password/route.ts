import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await req.json() as { password?: string };
  const expected = process.env.SENSITIVE_PAGE_PASSWORD;

  if (!expected) {
    // No password configured — allow through
    return NextResponse.json({ ok: true });
  }

  if (!password || password !== expected) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
