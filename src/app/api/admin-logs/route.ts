import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

/**
 * Returns the session token so the client can call admin-api.sf-alpha.com
 * directly from the browser (bypassing server-side proxy issues).
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token: session.token });
}
