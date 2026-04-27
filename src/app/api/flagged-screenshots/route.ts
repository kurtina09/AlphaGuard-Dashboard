import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readFlagged } from "@/lib/detection-rules-store";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ items: await readFlagged() });
}
