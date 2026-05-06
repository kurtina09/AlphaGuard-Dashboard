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
  player_guid: string | null;   // null for guid-mode lookups; populated for hash/description
};

export async function GET(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url        = new URL(req.url);
  const playerGuid = url.searchParams.get("player_guid")?.trim();
  const hashQuery  = url.searchParams.get("hash")?.trim();
  const descQuery  = url.searchParams.get("description")?.trim();

  if (!playerGuid && !hashQuery && !descQuery) {
    return NextResponse.json(
      { error: "player_guid, hash, or description is required." },
      { status: 400 },
    );
  }

  // ── helper to map a DB row to HwidRow ─────────────────────────────────────
  function mapRow(r: RowDataPacket, guid: string | null): HwidRow {
    return {
      id: r.id as number,
      session_id: "",
      type: r.type as string,
      hash: r.hash as string,
      description: (r.description as string | null) ?? null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
      last_seen:  r.last_seen  instanceof Date ? r.last_seen.toISOString()  : String(r.last_seen  ?? ""),
      is_banned: Boolean(r.is_banned),
      banned_hwid_id: (r.banned_hwid_id as number | null) ?? null,
      player_guid: guid,
    };
  }

  try {
    const pool = getPool();

    // ── GUID mode (original logic) ─────────────────────────────────────────
    if (playerGuid) {
      const [sessionRows] = await pool.query<RowDataPacket[]>(
        "SELECT session_id FROM `session` WHERE player_guid = ?",
        [playerGuid],
      );

      if (!sessionRows.length) {
        return NextResponse.json({ hwids: [], session_count: 0 });
      }

      const sessionIds   = sessionRows.map((r) => r.session_id as string);
      const placeholders = sessionIds.map(() => "?").join(",");

      const [rows] = await pool.query<RowDataPacket[]>(
        `SELECT
           MIN(h.id)          AS id,
           h.type,
           h.hash,
           MAX(h.description) AS description,
           MIN(h.created_at)  AS created_at,
           MAX(h.last_seen)   AS last_seen,
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

      const hwids = rows.map((r) => mapRow(r, null));
      return NextResponse.json({ hwids, session_count: sessionIds.length });
    }

    // ── Hash / Description mode ────────────────────────────────────────────
    const conditions: string[] = [];
    const params: string[]     = [];

    if (hashQuery) {
      conditions.push("h.hash = ?");
      params.push(hashQuery);
    }
    if (descQuery) {
      conditions.push("h.description LIKE ?");
      params.push(`%${descQuery}%`);
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         MIN(h.id)          AS id,
         h.type,
         h.hash,
         MAX(h.description) AS description,
         MIN(h.created_at)  AS created_at,
         MAX(h.last_seen)   AS last_seen,
         s.player_guid,
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
       JOIN \`session\` s ON s.session_id = h.session_id
       WHERE ${conditions.join(" AND ")}
       GROUP BY h.type, h.hash, s.player_guid
       ORDER BY MAX(h.last_seen) DESC
       LIMIT 200`,
      params,
    );

    const hwids = rows.map((r) => mapRow(r, (r.player_guid as string | null) ?? null));
    const uniquePlayers = new Set(hwids.map((h) => h.player_guid).filter(Boolean)).size;
    return NextResponse.json({ hwids, session_count: uniquePlayers });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
