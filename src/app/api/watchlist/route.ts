import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";

async function ensureTable() {
  const pool = getPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS watchlist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      player_guid VARCHAR(36) NOT NULL,
      reason TEXT NOT NULL,
      added_by VARCHAR(100),
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureTable();
    const pool = getPool();
    const [rows] = await pool.execute(
      "SELECT id, player_guid, reason, added_by, added_at FROM watchlist ORDER BY added_at DESC"
    );
    return NextResponse.json({ items: rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
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

  const { player_guid, reason } = body as { player_guid?: string; reason?: string };

  if (!player_guid || !/^[0-9a-f-]{36}$/i.test(player_guid)) {
    return NextResponse.json({ error: "Invalid or missing player_guid." }, { status: 400 });
  }
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  try {
    await ensureTable();
    const pool = getPool();
    await pool.execute(
      "INSERT INTO watchlist (player_guid, reason, added_by) VALUES (?, ?, ?)",
      [player_guid, reason.trim(), session.codename || session.username || "admin"]
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
