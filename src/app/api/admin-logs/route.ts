import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

const UPSTREAM     = process.env.PATCH_API_BASE ?? "https://admin-api.sf-alpha.com/v2";
const upstreamHost = new URL(UPSTREAM).host;

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const inUrl    = new URL(req.url);
  const upstream = new URL(`${UPSTREAM}/admin/logs`);
  inUrl.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

  // Forward all browser headers (User-Agent, Accept, etc.) for Cloudflare bypass,
  // then override the host/origin/referer and inject the session token — same
  // pattern used by the working /api/v2 proxy.
  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (["host", "connection", "transfer-encoding", "origin", "referer"].includes(k.toLowerCase())) continue;
    headers.set(k, v);
  }
  headers.set("Authorization", `Bearer ${session.token}`);
  headers.set("host",    upstreamHost);
  headers.set("origin",  `https://${upstreamHost}`);
  headers.set("referer", `https://${upstreamHost}/`);

  try {
    const res  = await fetch(upstream.toString(), { headers, cache: "no-store" });
    const text = await res.text();

    // Cloudflare challenge returns HTML
    if (text.trimStart().startsWith("<") || text.includes("cf-chl") || text.includes("Just a moment")) {
      return NextResponse.json(
        { error: "Request blocked by Cloudflare bot protection." },
        { status: 403 },
      );
    }

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
