import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readBannedTickets, writeBannedTickets, type BannedTicketEntry } from "@/lib/banned-ticket-store";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const items = await readBannedTickets();
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read list.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { player_guid, codename, reason } = body as {
    player_guid?: string;
    codename?: string;
    reason?: string;
  };

  if (!player_guid || !/^[0-9a-f-]{36}$/i.test(player_guid)) {
    return NextResponse.json({ error: "Invalid or missing player_guid." }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  try {
    const items = await readBannedTickets();

    const exists = items.some(
      (e) => e.player_guid.toLowerCase() === player_guid.toLowerCase(),
    );
    if (exists) {
      return NextResponse.json(
        { error: "This player GUID is already in the banned ticket list." },
        { status: 409 },
      );
    }

    const entry: BannedTicketEntry = {
      id: Date.now(),
      player_guid,
      ...(codename?.trim() ? { codename: codename.trim() } : {}),
      reason: reason.trim(),
      added_by: session.codename || session.username || "admin",
      added_at: new Date().toISOString(),
    };
    await writeBannedTickets([entry, ...items]);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
