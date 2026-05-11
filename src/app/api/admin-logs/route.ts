import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

/**
 * Returns the admin-api token stored at login time.
 * This is a separate JWT from admin-api.sf-alpha.com (different signing key
 * from the game API token), fetched during login with the user's own credentials.
 */
export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.adminToken) {
    return NextResponse.json(
      { error: "No admin token in session — please log out and log back in." },
      { status: 401 },
    );
  }
  return NextResponse.json({ token: session.adminToken });
}
