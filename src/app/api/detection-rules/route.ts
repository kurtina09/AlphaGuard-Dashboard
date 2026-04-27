import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readRules, writeRules, type DetectionRule } from "@/lib/detection-rules-store";

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ rules: await readRules() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { label, description } = await req.json() as { label?: string; description?: string };
  if (!label?.trim()) return NextResponse.json({ error: "Label is required." }, { status: 400 });
  if (!description?.trim()) return NextResponse.json({ error: "Description is required." }, { status: 400 });

  const rules = await readRules();
  const entry: DetectionRule = {
    id: Date.now(),
    label: label.trim(),
    description: description.trim(),
    enabled: true,
    created_at: new Date().toISOString(),
  };
  await writeRules([entry, ...rules]);
  return NextResponse.json({ success: true, rule: entry });
}
