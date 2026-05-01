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
    const [rows] = await pool.query<RowDataPacket[]>("SHOW TABLES");
    // SHOW TABLES returns one column named "Tables_in_<dbname>"
    const tables = rows.map((r) => Object.values(r)[0] as string);
    return NextResponse.json({ tables });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
