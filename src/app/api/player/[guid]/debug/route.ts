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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ guid: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guid } = await params;
  const token = session.token!;

  const [playerRes, userRes] = await Promise.all([
    fetch(`${UPSTREAM}/player/${guid}`, { headers: authHeaders(token), cache: "no-store" }),
    fetch(`${UPSTREAM}/users/${guid}`, { headers: authHeaders(token), cache: "no-store" }),
  ]);

  const playerBody = await playerRes.text();
  const userBody = await userRes.text();

  return NextResponse.json({
    guid_requested: guid,
    session_user_guid: session.userGuid,
    player_endpoint: {
      status: playerRes.status,
      body: (() => { try { return JSON.parse(playerBody); } catch { return playerBody.slice(0, 500); } })(),
    },
    users_endpoint: {
      status: userRes.status,
      body: (() => { try { return JSON.parse(userBody); } catch { return userBody.slice(0, 500); } })(),
    },
  });
}
