import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { acFetch } from "@/lib/ac-token";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const qs = new URLSearchParams();
  const allowed = ["page", "size", "search_name_query", "player_guid", "from", "to"];
  for (const k of allowed) {
    const v = url.searchParams.get(k);
    if (v) qs.set(k, v);
  }
  if (!qs.has("page")) qs.set("page", "0");
  if (!qs.has("size")) qs.set("size", "20");

  try {
    const res = await acFetch(`/auth/ac-detections?${qs.toString()}`);
    const body = await res.json().catch(() => null);
    if (!res.ok) {
return NextResponse.json(
        { error: body?.diagnostics?.message || `Upstream error (${res.status})` },
        { status: res.status },
      );
    }
    return NextResponse.json(body);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Detections fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
