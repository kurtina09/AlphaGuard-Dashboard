import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";

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
    const pool = getPool();
    const [result] = await pool.execute("DELETE FROM watchlist WHERE id = ?", [numId]) as any[];
    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
