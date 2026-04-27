import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readRules, writeRules } from "@/lib/detection-rules-store";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  const body = await req.json() as { enabled?: boolean; label?: string; description?: string };
  const rules = await readRules();
  const idx = rules.findIndex((r) => r.id === numId);
  if (idx === -1) return NextResponse.json({ error: "Rule not found." }, { status: 404 });

  if (body.enabled !== undefined) rules[idx].enabled = body.enabled;
  if (body.label?.trim()) rules[idx].label = body.label.trim();
  if (body.description?.trim()) rules[idx].description = body.description.trim();

  await writeRules(rules);
  return NextResponse.json({ success: true, rule: rules[idx] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  const rules = await readRules();
  const filtered = rules.filter((r) => r.id !== numId);
  if (filtered.length === rules.length) return NextResponse.json({ error: "Rule not found." }, { status: 404 });
  await writeRules(filtered);
  return NextResponse.json({ success: true });
}
