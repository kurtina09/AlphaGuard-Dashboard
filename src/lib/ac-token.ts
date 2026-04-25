import { GAME_API_BASE, login } from "./game-api";

let cachedToken: string | null = null;
let inflight: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  const username = process.env.AC_USERNAME;
  const password = process.env.AC_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "AC_USERNAME / AC_PASSWORD missing — set them in .env.local to access the detections API.",
    );
  }
  const result = await login(username, password);
  cachedToken = result.token;
  return cachedToken;
}

async function getToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken) return cachedToken;
  if (!inflight) {
    inflight = refreshToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function acFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await getToken();
  let res = await fetch(`${GAME_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  if (res.status === 401) {
    token = await getToken(true);
    res = await fetch(`${GAME_API_BASE}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  }
  return res;
}
