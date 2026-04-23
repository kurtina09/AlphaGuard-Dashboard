import { NextResponse } from "next/server";
import { login } from "@/lib/game-api";
import { getSession, isAdmin } from "@/lib/session";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const username = (body.username || "").trim();
  const password = body.password || "";
  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }
  try {
    const result = await login(username, password);
    if (!isAdmin(result.role_name)) {
      return NextResponse.json(
        { error: "This account is not authorized to use the AlphaGuard portal." },
        { status: 403 },
      );
    }
    const session = await getSession();
    session.isLoggedIn = true;
    session.token = result.token;
    session.userGuid = result.user_guid;
    session.playerGuid = result.player_guid;
    session.username = result.username;
    session.codename = result.codename;
    session.roleName = result.role_name;
    await session.save();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to reach login service.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
