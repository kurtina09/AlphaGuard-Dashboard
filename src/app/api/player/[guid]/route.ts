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

  const playerInfo = await apiFetch(`/player/${guid}`, token);

  if (!playerInfo) {
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  return NextResponse.json({
    player_guid: guid,
    codename: playerInfo.codename ?? null,
    rank_num: playerInfo.rank_num ?? null,
    rank_exp: playerInfo.rank_exp ?? null,
    kills: playerInfo.kills ?? null,
    kill_death_ratio: playerInfo.kill_death_ratio ?? null,
    matches_played: playerInfo.matches_played ?? null,
    win_ratio: playerInfo.win_ratio ?? null,
  });
}
