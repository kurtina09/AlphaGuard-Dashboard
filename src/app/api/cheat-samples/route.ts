import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readSamples, writeSamples, type CheatSample } from "@/lib/cheat-sample-store";

const MAX_SAMPLES = 5;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB per sample

export async function GET() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const samples = await readSamples();
  // Strip base64 data from list response to keep it lightweight
  return NextResponse.json({
    samples: samples.map(({ data: _data, ...rest }) => rest),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const samples = await readSamples();
  if (samples.length >= MAX_SAMPLES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_SAMPLES} samples allowed. Delete one first.` },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const label = (formData.get("label") as string | null)?.trim() || "Cheat example";

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 2 MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mediaType = file.type || "image/jpeg";
  const data = buffer.toString("base64");

  const entry: CheatSample = {
    id: Date.now(),
    label,
    data,
    mediaType,
    created_at: new Date().toISOString(),
  };
  await writeSamples([...samples, entry]);
  return NextResponse.json({ success: true, id: entry.id });
}
