import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { readSamples, writeSamples } from "@/lib/cheat-sample-store";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const samples = await readSamples();
  await writeSamples(samples.filter((s) => s.id !== parseInt(id, 10)));
  return NextResponse.json({ success: true });
}
