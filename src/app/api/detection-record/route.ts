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

  const url = new URL(req.url);
  const playerGuid = url.searchParams.get("player_guid")?.trim() || "";
  const flag       = url.searchParams.get("flag")?.trim() || "";
  const action     = url.searchParams.get("action")?.trim() || "";
  const page = Math.max(0, Number(url.searchParams.get("page") || 0));
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get("size") || 50)));
  const offset = page * size;

  try {
    const pool = getPool();

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (playerGuid) { conditions.push("player_guid = ?");         params.push(playerGuid); }
    if (flag)       { conditions.push("flag LIKE ?");              params.push(`%${flag}%`); }
    if (action)     { conditions.push("action LIKE ?");            params.push(`%${action}%`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM detection_record ${where}`, params,
    );
    const totalCount = Number((countRows[0] as { c: number }).c || 0);

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, player_guid, flag, action, description, \`date\`
       FROM detection_record
       ${where}
       ORDER BY \`date\` DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    const records: DetectionRecord[] = rows.map((r) => ({
      id: r.id as number,
      player_guid: r.player_guid as string,
      flag: r.flag as string,
      action: r.action as string,
      description: (r.description as string | null) ?? null,
      date: r.date instanceof Date ? r.date.toISOString() : String(r.date ?? ""),
    }));

    const totalPages = Math.max(1, Math.ceil(totalCount / size));
    return NextResponse.json({
      records,
      page,
      size,
      total_count: totalCount,
      total_pages: totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
