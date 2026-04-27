import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readBannedTickets, writeBannedTickets } from "@/lib/banned-ticket-store";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid ID." }, { status: 400 });
  }

  try {
    const items = await readBannedTickets();
    const filtered = items.filter((e) => e.id !== numId);
    if (filtered.length === items.length) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
    await writeBannedTickets(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete entry.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
