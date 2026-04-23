import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

const UPSTREAM = process.env.GAME_API_BASE ?? "https://api.sf-alpha.com/v2";
const upstreamHost = new URL(UPSTREAM).host;

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    host: upstreamHost,
    origin: `https://${upstreamHost}`,
    referer: `https://${upstreamHost}/`,
  };
}

async function apiFetch(path: string, token: string) {
  const res = await fetch(`${UPSTREAM}${path}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ guid: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guid } = await params;
  if (!guid || !/^[0-9a-f-]{36}$/i.test(guid)) {
    return NextResponse.json({ error: "Invalid GUID" }, { status: 400 });
  }

  const token = session.token!;

  // Fetch player stats and attempt user lookup in parallel.
  // User lookup tries player_guid first; SF Alpha may map it to the linked account.
  const [playerInfo, userInfo] = await Promise.all([
    apiFetch(`/player/${guid}`, token),
    apiFetch(`/users/${guid}`, token),
  ]);

  if (!playerInfo && !userInfo) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  return NextResponse.json({
    player_guid: guid,
    // From playerInfo
    codename: playerInfo?.codename ?? userInfo?.user?.codename ?? null,
    rank_num: playerInfo?.rank_num ?? userInfo?.user?.rank_num ?? null,
    rank_exp: playerInfo?.rank_exp ?? userInfo?.user?.rank_exp ?? null,
    // From userInfo (may be null if lookup failed)
    username: userInfo?.user?.name ?? null,
    email: userInfo?.user?.email ?? null,
    region: userInfo?.user?.region ?? null,
    birthdate: userInfo?.user?.birthdate ?? null,
  });
}
