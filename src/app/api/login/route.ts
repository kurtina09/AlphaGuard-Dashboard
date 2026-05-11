import { NextResponse } from "next/server";
import { login } from "@/lib/game-api";
import { getSession, isAdmin } from "@/lib/session";

const ADMIN_API_BASE =
  process.env.PATCH_API_BASE || "https://admin-api.sf-alpha.com/v2";

async function loginAdminApi(
  username: string,
  password: string,
): Promise<string | null> {
  try {
    const url = `${ADMIN_API_BASE}/auth/login`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, keep_me_logged_in: false }),
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[admin-api login] ${res.status} from ${url}:`, text.slice(0, 500));
      return null;
    }
    let body: Record<string, unknown>;
    try { body = JSON.parse(text); } catch { body = {}; }
    console.log("[admin-api login] response keys:", Object.keys(body));
    const token = (body.token ?? body.access_token ?? null) as string | null;
    if (!token) console.error("[admin-api login] no token field in response:", text.slice(0, 300));
    return token;
  } catch (e) {
    console.error("[admin-api login] fetch error:", e);
    return null;
  }
}

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
    // Also get a token from admin-api (different signing key)
    const adminToken = await loginAdminApi(username, password);

    const session = await getSession();
    session.isLoggedIn = true;
    session.token = result.token;
    session.adminToken = adminToken ?? undefined;
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
