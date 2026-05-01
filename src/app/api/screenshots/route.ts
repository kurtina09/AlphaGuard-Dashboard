import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool, screenshotTable } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type Row = RowDataPacket & {
  unique_id: number | string;
  player_guid: string;
  time: Date | string;
  notes?: string | null;
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(0, Number(url.searchParams.get("page") || 0));
  const size = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("size") || 24)),
  );
  const playerGuid = url.searchParams.get("player_guid")?.trim() || "";
  const fromRaw = url.searchParams.get("from")?.trim() || "";
  const toRaw = url.searchParams.get("to")?.trim() || "";
  const tableParam = url.searchParams.get("table")?.trim() || "";
  const withNotes = url.searchParams.get("notes") === "1";

  const table = (tableParam && /^[A-Za-z0-9_]+$/.test(tableParam))
    ? tableParam
    : screenshotTable();
  const offset = page * size;

  try {
    const pool = getPool();

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (playerGuid) { conditions.push("player_guid = ?"); params.push(playerGuid); }
    if (fromRaw)    { conditions.push("`time` >= ?");     params.push(new Date(fromRaw).toISOString()); }
    if (toRaw)      { conditions.push("`time` <= ?");     params.push(new Date(toRaw).toISOString()); }
    const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM \`${table}\` ${whereSql}`,
      params,
    );
    const totalCount = Number((countRows[0] as { c: number }).c || 0);

    const selectCols = withNotes
      ? "unique_id, player_guid, `time`, `notes`"
      : "unique_id, player_guid, `time`";

    const [rows] = await pool.query<Row[]>(
      `SELECT ${selectCols}
         FROM \`${table}\`
         ${whereSql}
         ORDER BY \`time\` DESC
         LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    const items = rows.map((r) => ({
      unique_id: String(r.unique_id),
      player_guid: r.player_guid,
      time: r.time instanceof Date ? r.time.toISOString() : String(r.time || ""),
      ...(withNotes && { notes: r.notes ?? null }),
    }));

    const totalPages = Math.max(1, Math.ceil(totalCount / size));
    return NextResponse.json({
      items,
      page,
      size,
      total_count: totalCount,
      total_pages: totalPages,
      first: page === 0,
      last: page >= totalPages - 1,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
