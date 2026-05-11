import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

const UPSTREAM = process.env.PATCH_API_BASE ?? "https://patch-api.rivalsf.com";
const upstreamHost = new URL(UPSTREAM).host;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inUrl    = new URL(req.url);
  const upstream = new URL(`${UPSTREAM}/admin/logs`);
  inUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
        host: upstreamHost,
        origin: `https://${upstreamHost}`,
        referer: `https://${upstreamHost}/`,
      },
      cache: "no-store",
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json({ error: text.slice(0, 500) }, { status: res.status });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upstream error" },
      { status: 500 },
    );
  }
}
