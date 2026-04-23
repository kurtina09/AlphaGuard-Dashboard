export const GAME_API_BASE =
  process.env.GAME_API_BASE || "https://api.sf-alpha.com/v2";

export type LoginResult = {
  token: string;
  username: string;
  user_guid: string;
  player_guid: string;
  codename: string;
  role_name: string;
  clan_guid?: string;
  cash?: number;
  market_place_agreement?: boolean;
};

export async function login(
  username: string,
  password: string,
): Promise<LoginResult> {
  const res = await fetch(`${GAME_API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, keep_me_logged_in: false }),
    cache: "no-store",
  });
  if (!res.ok) {
    let message = `Login failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.diagnostics?.message) message = body.diagnostics.message;
    } catch {}
    throw new Error(message);
  }
  return (await res.json()) as LoginResult;
}
