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

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = session.token!;

  const [matchesRes, mapsRes] = await Promise.all([
    fetch(`${UPSTREAM}/games/fps/matches`, {
      headers: authHeaders(token),
      cache: "no-store",
    }),
    fetch(`${UPSTREAM}/games/fps/maps`, {
      headers: authHeaders(token),
      cache: "no-store",
    }),
  ]);

  const matchesBody = await matchesRes.text();
  const mapsBody = await mapsRes.text();

  return NextResponse.json({
    matches_status: matchesRes.status,
    matches_ok: matchesRes.ok,
    matches_body: (() => { try { return JSON.parse(matchesBody); } catch { return matchesBody.slice(0, 500); } })(),
    maps_status: mapsRes.status,
    maps_ok: mapsRes.ok,
    maps_body: (() => { try { return JSON.parse(mapsBody); } catch { return mapsBody.slice(0, 500); } })(),
  });
}
