import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export type DetectionRecord = {
  id: number;
  player_guid: string;
  flag: string;
  action: string;
  description: string | null;
  date: string;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playerGuid = new URL(req.url).searchParams.get("player_guid")?.trim();
  if (!playerGuid) {
    return NextResponse.json({ error: "player_guid is required." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, player_guid, flag, action, description, \`date\`
       FROM detection_record
       WHERE player_guid = ?
       ORDER BY \`date\` DESC`,
      [playerGuid],
    );

    const records: DetectionRecord[] = rows.map((r) => ({
      id: r.id as number,
      player_guid: r.player_guid as string,
      flag: r.flag as string,
      action: r.action as string,
      description: (r.description as string | null) ?? null,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date ?? ""),
    }));

    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
