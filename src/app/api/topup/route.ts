import { NextRequest, NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { topupFetch } from "@/lib/topup-token";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { playerGuid, amount, referenceId, source } = body as {
    playerGuid?: string;
    amount?: number;
    referenceId?: string;
    source?: string;
  };

  if (!playerGuid || !/^[0-9a-f-]{36}$/i.test(playerGuid)) {
    return NextResponse.json({ error: "Invalid or missing playerGuid." }, { status: 400 });
  }
  if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }
  if (!referenceId?.trim()) {
    return NextResponse.json({ error: "Reference ID is required." }, { status: 400 });
  }
  if (!source?.trim()) {
    return NextResponse.json({ error: "Source is required." }, { status: 400 });
  }

  let res: Response;
  try {
    res = await topupFetch("/payment/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerGuid,
        amount: Number(amount),
        referenceId: referenceId.trim(),
        source: source.trim(),
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Network error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? (data as { message: string }).message
        : text || `Upstream error (${res.status})`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  return NextResponse.json({ success: true, data });
}
