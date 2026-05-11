import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { getAdminToken } from "@/lib/admin-api-token";

/**
 * Returns a token from admin-api.sf-alpha.com so the client can call
 * the admin Worker proxy directly from the browser.
 * Uses AC_USERNAME / AC_PASSWORD to authenticate against admin-api.
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getAdminToken();
    return NextResponse.json({ token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get admin token";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
