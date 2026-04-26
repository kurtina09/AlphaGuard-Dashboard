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

function doFetch(path: string, init: RequestInit, token: string): Promise<Response> {
  return fetch(`${GAME_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
}

async function isTokenExpiredResponse(res: Response): Promise<boolean> {
  if (res.status !== 500) return false;
  try {
    const body = await res.clone().json() as { message?: string };
    return typeof body.message === "string" && /token.*expired|expired.*token/i.test(body.message);
  } catch {
    return false;
  }
}

export async function acFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  let token = await getToken();
  let res = await doFetch(path, init, token);

  // The upstream returns 401 for missing auth and 500 for expired tokens.
  // In either case, force-refresh and retry once.
  if (res.status === 401 || await isTokenExpiredResponse(res)) {
    token = await getToken(true);
    res = await doFetch(path, init, token);
  }

  return res;
}
