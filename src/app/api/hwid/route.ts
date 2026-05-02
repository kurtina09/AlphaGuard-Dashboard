import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export type HwidRow = {
  id: number;
  session_id: string;
  type: string;
  hash: string;
  description: string | null;
  created_at: string;
  last_seen: string;
  is_banned: boolean;
  banned_hwid_id: number | null;
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

    // Step 1: get all session_ids for this player
    const [sessionRows] = await pool.query<RowDataPacket[]>(
      "SELECT session_id FROM `session` WHERE player_guid = ?",
      [playerGuid],
    );

    if (!sessionRows.length) {
      return NextResponse.json({ hwids: [], session_count: 0 });
    }

    const sessionIds = sessionRows.map((r) => r.session_id as string);

    // Step 2: get all hwid rows for those sessions, deduplicated by type+hash,
    // and mark which ones are already in banned_hwid
    const placeholders = sessionIds.map(() => "?").join(",");
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         MIN(h.id)          AS id,
         h.type,
         h.hash,
         MAX(h.description) AS description,
         MIN(h.created_at)  AS created_at,
         MAX(h.last_seen)   AS last_seen,
         COUNT(DISTINCT h.session_id) AS session_count,
         EXISTS(
           SELECT 1 FROM banned_hwid bh
           WHERE bh.type = h.type AND bh.hash = h.hash
         ) AS is_banned,
         (
           SELECT bh.id FROM banned_hwid bh
           WHERE bh.type = h.type AND bh.hash = h.hash
           LIMIT 1
         ) AS banned_hwid_id
       FROM hwid h
       WHERE h.session_id IN (${placeholders})
       GROUP BY h.type, h.hash
       ORDER BY MAX(h.last_seen) DESC`,
      sessionIds,
    );

    const hwids: HwidRow[] = rows.map((r) => ({
      id: r.id as number,
      session_id: "",
      type: r.type as string,
      hash: r.hash as string,
      description: (r.description as string | null) ?? null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
      last_seen: r.last_seen instanceof Date ? r.last_seen.toISOString() : String(r.last_seen ?? ""),
      is_banned: Boolean(r.is_banned),
      banned_hwid_id: (r.banned_hwid_id as number | null) ?? null,
    }));

    return NextResponse.json({ hwids, session_count: sessionIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
