import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getPool, screenshotTable } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

type Row = RowDataPacket & { data: Buffer | null };

function sniffMime(buf: Buffer): string {
  if (buf.length >= 8) {
    const h = buf.subarray(0, 8);
    if (h[0] === 0xff && h[1] === 0xd8 && h[2] === 0xff) return "image/jpeg";
    if (
      h[0] === 0x89 &&
      h[1] === 0x50 &&
      h[2] === 0x4e &&
      h[3] === 0x47 &&
      h[4] === 0x0d &&
      h[5] === 0x0a &&
      h[6] === 0x1a &&
      h[7] === 0x0a
    )
      return "image/png";
    if (h[0] === 0x47 && h[1] === 0x49 && h[2] === 0x46) return "image/gif";
    if (
      h[0] === 0x52 &&
      h[1] === 0x49 &&
      h[2] === 0x46 &&
      h[3] === 0x46 &&
      buf.length >= 12 &&
      h[0] === 0x52
    ) {
      return "image/webp";
    }
    if (h[0] === 0x42 && h[1] === 0x4d) return "image/bmp";
  }
  return "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id || !/^[0-9]+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const table = screenshotTable();
  try {
    const pool = getPool();
    const [rows] = await pool.query<Row[]>(
      `SELECT \`data\` FROM \`${table}\` WHERE unique_id = ? LIMIT 1`,
      [Number(id)],
    );
    if (!rows.length || !rows[0].data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const buf = rows[0].data as Buffer;
    const mime = sniffMime(buf);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=60",
        "Content-Length": String(buf.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Database error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
