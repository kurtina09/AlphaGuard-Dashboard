import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, type, hash, description, banned_date FROM banned_hwid ORDER BY banned_date DESC",
    );
    const items = rows.map((r) => ({
      id: r.id as number,
      type: r.type as string,
      hash: r.hash as string,
      description: (r.description as string | null) ?? null,
      banned_date: r.banned_date instanceof Date
        ? r.banned_date.toISOString()
        : String(r.banned_date ?? ""),
    }));
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
