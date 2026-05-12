import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

/**
 * Returns the session token so the browser can authenticate with the
 * Cloudflare Worker proxy. The Worker handles admin-api.sf-alpha.com
 * auth internally using its own credentials.
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ token: session.token });
}
