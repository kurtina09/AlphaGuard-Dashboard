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

  const [matches, maps] = await Promise.all([
    matchesRes.ok ? matchesRes.json().catch(() => []) : Promise.resolve([]),
    mapsRes.ok ? mapsRes.json().catch(() => []) : Promise.resolve([]),
  ]);

  // Build guid → map info lookup
  const mapLookup: Record<string, { name: string; image_url: string }> = {};
  if (Array.isArray(maps)) {
    for (const m of maps) {
      mapLookup[m.guid] = { name: m.name, image_url: m.image_url ?? "" };
    }
  }

  const enriched = Array.isArray(matches)
    ? matches.map((m: {
        guid: string;
        host_guid: string;
        map_guid: string;
        game_mode: string;
        player_count: number;
        max_players: number;
        score_limit: number;
        time_limit: number;
        status: string;
      }) => ({
        ...m,
        map_name: mapLookup[m.map_guid]?.name ?? m.map_guid,
        map_image: mapLookup[m.map_guid]?.image_url ?? "",
      }))
    : [];

  return NextResponse.json({ matches: enriched, total: enriched.length });
}
