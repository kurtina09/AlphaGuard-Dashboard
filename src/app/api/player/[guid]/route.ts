import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

const UPSTREAM = process.env.GAME_API_BASE ?? "https://api.sf-alpha.com/v2";
const upstreamHost = new URL(UPSTREAM).host;

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

  try {
    const res = await fetch(`${UPSTREAM}/player/${guid}`, {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        host: upstreamHost,
        origin: `https://${upstreamHost}`,
        referer: `https://${upstreamHost}/`,
      },
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: body?.diagnostics?.message || `Upstream error (${res.status})` },
        { status: res.status },
      );
    }
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Player fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
