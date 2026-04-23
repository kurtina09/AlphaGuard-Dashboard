import { type NextRequest, NextResponse } from "next/server";

const UPSTREAM = process.env.GAME_API_BASE ?? "https://api.sf-alpha.com/v2";

async function proxy(req: NextRequest, path: string[]) {
  const url = new URL(`${UPSTREAM}/${path.join("/")}`);
  url.search = req.nextUrl.search;

  const headers = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (["host", "connection", "transfer-encoding"].includes(k.toLowerCase()))
      continue;
    headers.set(k, v);
  }

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? await req.arrayBuffer()
      : undefined;

  const upstream = await fetch(url.toString(), {
    method: req.method,
    headers,
    body,
    cache: "no-store",
  });

  const resHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (["transfer-encoding", "connection"].includes(k.toLowerCase())) continue;
    resHeaders.set(k, v);
  }

  return new NextResponse(upstream.body, {
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
