import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

const UPSTREAM = process.env.GAME_API_BASE ?? "https://api.sf-alpha.com/v2";
const upstreamHost = new URL(UPSTREAM).host;

async function fetchCodename(guid: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${UPSTREAM}/player/${guid}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        host: upstreamHost,
        origin: `https://${upstreamHost}`,
        referer: `https://${upstreamHost}/`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json() as { codename?: string };
    return data.codename ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = getPool();

    // JOIN through hwid → session to get the player_guid associated with each ban
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT bh.id, bh.type, bh.hash, bh.description, bh.banned_date,
              s.player_guid
       FROM banned_hwid bh
       LEFT JOIN hwid h ON h.id = bh.id
       LEFT JOIN \`session\` s ON s.session_id = h.session_id
       ORDER BY bh.banned_date DESC`,
    );

    const items = rows.map((r) => ({
      id: r.id as number,
      type: r.type as string,
      hash: r.hash as string,
      description: (r.description as string | null) ?? null,
      banned_date: r.banned_date instanceof Date
        ? r.banned_date.toISOString()
        : String(r.banned_date ?? ""),
      player_guid: (r.player_guid as string | null) ?? null,
      codename: null as string | null,
    }));

    // Batch-fetch codenames for all unique player_guids
    const token = session.token;
    if (token) {
      const uniqueGuids = [...new Set(items.map((i) => i.player_guid).filter(Boolean))] as string[];
      const results = await Promise.all(uniqueGuids.map((g) => fetchCodename(g, token)));
      const codenameMap: Record<string, string | null> = {};
      uniqueGuids.forEach((g, i) => { codenameMap[g] = results[i]; });
      for (const item of items) {
        if (item.player_guid) item.codename = codenameMap[item.player_guid] ?? null;
      }
    }

    return NextResponse.json({ items });
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

  const { id, type, hash, description } = await req.json() as {
    id: number;
    type: string;
    hash: string;
    description?: string;
  };

  if (!id || !type || !hash) {
    return NextResponse.json({ error: "id, type and hash are required." }, { status: 400 });
  }

  try {
    const pool = getPool();

    // Check for duplicate
    const [existing] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM banned_hwid WHERE type = ? AND hash = ? LIMIT 1",
      [type, hash],
    );
    if ((existing as RowDataPacket[]).length > 0) {
      return NextResponse.json({ error: "This HWID is already banned." }, { status: 409 });
    }

    await pool.query(
      "INSERT INTO banned_hwid (id, type, hash, description, banned_date) VALUES (?, ?, ?, ?, NOW())",
      [id, type, hash, description ?? null],
    );

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 },
    );
  }
}
