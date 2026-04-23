import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  isLoggedIn: boolean;
  token?: string;
  userGuid?: string;
  playerGuid?: string;
  username?: string;
  codename?: string;
  roleName?: string;
};

const password = process.env.SESSION_SECRET;
if (!password) {
  console.warn(
    "SESSION_SECRET is not set. Set it in .env.local before using the dashboard.",
  );
}

export const sessionOptions: SessionOptions = {
  password: password || "fallback-insecure-password-please-change-me-now-really",
  cookieName: "alphaguard_session",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  },
};

export async function getSession() {
  const store = await cookies();
  const session = await getIronSession<SessionData>(store, sessionOptions);
  return session;
}

export function isAdmin(roleName: string | undefined | null): boolean {
  if (!roleName) return false;
  const allowed = (process.env.ALLOWED_ROLES || "admin")
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(roleName.toLowerCase());
}
