import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readNotes, upsertNote, deleteNote } from "@/lib/hwid-notes-store";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const notes = await readNotes();
  return NextResponse.json({ notes });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { banned_hwid_id, note } = await req.json() as { banned_hwid_id: number; note: string };
  if (!banned_hwid_id) return NextResponse.json({ error: "banned_hwid_id required." }, { status: 400 });
  await upsertNote(banned_hwid_id, note ?? "");
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { banned_hwid_id } = await req.json() as { banned_hwid_id: number };
  if (!banned_hwid_id) return NextResponse.json({ error: "banned_hwid_id required." }, { status: 400 });
  await deleteNote(banned_hwid_id);
  return NextResponse.json({ success: true });
}
