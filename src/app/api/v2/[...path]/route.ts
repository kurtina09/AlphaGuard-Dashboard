import { type NextRequest, NextResponse } from "next/server";

const UPSTREAM = process.env.GAME_API_BASE ?? "https://api.sf-alpha.com/v2";
const upstreamHost = new URL(UPSTREAM).host;

async function proxy(req: NextRequest, path: string[]) {
  const url = new URL(`${UPSTREAM}/${path.join("/")}`);
  url.search = req.nextUrl.search;

  // Strip browser headers and set upstream host (mirrors Vite's changeOrigin: true)
  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (
      ["host", "connection", "transfer-encoding", "origin", "referer"].includes(
        k.toLowerCase(),
      )
    )
      continue;
    headers.set(k, v);
  }
  headers.set("host", upstreamHost);
  headers.set("origin", `https://${upstreamHost}`);
  headers.set("referer", `https://${upstreamHost}/`);

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(url.toString(), {
      method: req.method,
      headers,
      body,
      cache: "no-store",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Proxy fetch failed";
    console.error(`[proxy] fetch error → ${url}: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // On non-2xx, decode and log the full body so we can see what the API says
  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "(unreadable body)");
    console.error(
      `[proxy] upstream ${upstream.status} for ${req.method} /${path.join("/")}\n` +
        text.slice(0, 800),
    );
    // If it looks like a Cloudflare HTML challenge, return a clear message
    if (text.includes("cf-chl") || text.includes("Just a moment")) {
      return NextResponse.json(
        {
          error:
            "Request blocked by Cloudflare bot protection. See server console for details.",
        },
        { status: 403 },
      );
    }
    // Otherwise pass the upstream error through as JSON
    try {
      return NextResponse.json(JSON.parse(text), { status: upstream.status });
    } catch {
      return NextResponse.json(
        { error: text.slice(0, 300) },
        { status: upstream.status },
      );
    }
  }

  const resHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (
      ["transfer-encoding", "connection", "content-encoding"].includes(
        k.toLowerCase(),
      )
    )
      continue;
    resHeaders.set(k, v);
  }

  // Decompress and re-serve so content-encoding mismatches can't happen
  const responseText = await upstream.text();
  resHeaders.set("content-type", upstream.headers.get("content-type") ?? "application/json");

  return new NextResponse(responseText, {
    status: upstream.status,
    headers: resHeaders,
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  return proxy(req, (await params).path);
}
