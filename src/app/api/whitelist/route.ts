import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export type WhitelistEntry = {
  player_guid: string;
  screenshot: boolean;
  detection: boolean;
};

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT player_guid, screenshot, detection FROM whitelisted ORDER BY player_guid ASC",
    );
    const entries: WhitelistEntry[] = rows.map((r) => ({
      player_guid: r.player_guid as string,
      screenshot: Boolean(r.screenshot),
      detection: Boolean(r.detection),
    }));
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { player_guid, screenshot, detection } = await req.json() as {
    player_guid?: string;
    screenshot?: boolean;
    detection?: boolean;
  };

  if (!player_guid?.trim()) {
    return NextResponse.json({ error: "player_guid is required." }, { status: 400 });
  }

  if (!screenshot && !detection) {
    return NextResponse.json({ error: "Select at least one whitelist type." }, { status: 400 });
  }

  try {
    const pool = getPool();

    // Check for duplicate
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT player_guid FROM whitelisted WHERE player_guid = ? LIMIT 1",
      [player_guid.trim()],
    );
    if ((existing as RowDataPacket[]).length > 0) {
      return NextResponse.json({ error: "Player is already whitelisted." }, { status: 409 });
    }

    await pool.query(
      "INSERT INTO whitelisted (player_guid, screenshot, detection) VALUES (?, ?, ?)",
      [player_guid.trim(), screenshot ? 1 : 0, detection ? 1 : 0],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { player_guid } = await req.json() as { player_guid?: string };
  if (!player_guid?.trim()) {
    return NextResponse.json({ error: "player_guid is required." }, { status: 400 });
  }

  try {
    const pool = getPool();
    await pool.query("DELETE FROM whitelisted WHERE player_guid = ?", [player_guid.trim()]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
