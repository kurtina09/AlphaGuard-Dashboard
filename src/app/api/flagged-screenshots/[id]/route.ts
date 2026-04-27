import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";
import { removeFlagged } from "@/lib/detection-rules-store";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await removeFlagged(id);
  return NextResponse.json({ success: true });
}
