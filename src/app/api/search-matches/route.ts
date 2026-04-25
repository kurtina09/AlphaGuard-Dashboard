import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { acFetch } from "@/lib/ac-token";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const guid = searchParams.get("guid")?.trim();
  const rawPage = parseInt(searchParams.get("page") ?? "0", 10);
  const page = isNaN(rawPage) || rawPage < 0 ? 0 : rawPage;

  if (!guid) {
    return NextResponse.json({ error: "Missing player GUID." }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(guid)) {
    return NextResponse.json({ error: "Invalid player GUID format." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await acFetch(`/player/matches/${encodeURIComponent(guid)}?page=${page}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: `Upstream error (${res.status})${text ? `: ${text}` : ""}` },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
