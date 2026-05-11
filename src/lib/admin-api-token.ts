/**
 * Server-side token cache for admin-api.sf-alpha.com.
 * Logs in with AC_USERNAME / AC_PASSWORD against the admin API
 * and caches the result so we don't hit the auth endpoint on every request.
 */

const ADMIN_API_BASE =
  process.env.PATCH_API_BASE || "https://admin-api.sf-alpha.com/v2";

let cachedToken: string | null = null;
let cachedExpiry = 0;
let inflight: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  const username = process.env.AC_USERNAME;
  const password = process.env.AC_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "AC_USERNAME / AC_PASSWORD missing — set them in .env.local to use admin-api.",
    );
  }

  const res = await fetch(`${ADMIN_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, keep_me_logged_in: false }),
    cache: "no-store",
  });

  if (!res.ok) {
    let msg = `Admin login failed (${res.status})`;
    try {
      const body = await res.json() as { message?: string; error?: string };
      msg = body.message ?? body.error ?? msg;
    } catch {}
    throw new Error(msg);
  }

  const body = await res.json() as { token?: string; access_token?: string };
  const token = body.token ?? body.access_token;
  if (!token) throw new Error("Admin login succeeded but no token in response");

  cachedToken = token;
  // Cache for 7 hours (session is 8h; refresh before expiry)
  cachedExpiry = Date.now() + 7 * 60 * 60 * 1000;
  return token;
}

export async function getAdminToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && Date.now() < cachedExpiry) {
    return cachedToken;
  }
  if (!inflight) {
    inflight = refreshToken().finally(() => { inflight = null; });
  }
  return inflight;
}
