import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool, screenshotTable } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type Row = RowDataPacket & {
  unique_id: number | string;
  player_guid: string;
  time: Date | string;
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

  const table = screenshotTable();
  const offset = page * size;

  try {
    const pool = getPool();
    const filterSql = playerGuid ? `WHERE player_guid = ?` : "";
    const params: (string | number)[] = [];
    if (playerGuid) params.push(playerGuid);

    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS c FROM \`${table}\` ${filterSql}`,
      params,
    );
    const totalCount = Number((countRows[0] as { c: number }).c || 0);

    const [rows] = await pool.query<Row[]>(
      `SELECT unique_id, player_guid, \`time\`
         FROM \`${table}\`
         ${filterSql}
         ORDER BY \`time\` DESC
         LIMIT ? OFFSET ?`,
      [...params, size, offset],
    );

    const items = rows.map((r) => ({
      unique_id: String(r.unique_id),
      player_guid: r.player_guid,
      time:
        r.time instanceof Date ? r.time.toISOString() : String(r.time || ""),
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
