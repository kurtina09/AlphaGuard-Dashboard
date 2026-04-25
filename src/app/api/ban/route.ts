import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { acFetch } from "@/lib/ac-token";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { player_guid, reason, kick, ban } = body as {
    player_guid?: string;
    reason?: string;
    kick?: boolean;
    ban?: boolean;
  };

  if (!player_guid || !/^[0-9a-f-]{36}$/i.test(player_guid)) {
    return NextResponse.json({ error: "Invalid or missing player_guid." }, { status: 400 });
  }
  if (!reason || !reason.trim()) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }
  if (!kick && !ban) {
    return NextResponse.json({ error: "Select at least Kick or Ban." }, { status: 400 });
  }

  try {
    const res = await acFetch("/auth/ac-detection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_guid,
        game_id: "soldier-front",
        reason: reason.trim(),
        kick: !!kick,
        ban: !!ban,
      }),
    });

    const resBody = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: resBody?.diagnostics?.message || `Upstream error (${res.status})` },
        { status: res.status },
      );
    }
    return NextResponse.json({ success: true, data: resBody });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
