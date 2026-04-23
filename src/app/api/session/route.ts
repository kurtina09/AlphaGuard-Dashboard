import { NextResponse } from "next/server";
import { getSession, isAdmin } from "@/lib/session";

type LoginPayload = {
  token: string;
  username: string;
  user_guid: string;
  player_guid: string;
  codename: string;
  role_name: string;
};

export async function POST(req: Request) {
  let body: Partial<LoginPayload>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, username, user_guid, player_guid, codename, role_name } = body;

  if (!token || !role_name) {
    return NextResponse.json({ error: "Missing token or role." }, { status: 400 });
  }

  if (!isAdmin(role_name)) {
    return NextResponse.json(
      { error: "This account is not authorized to use the AlphaGuard portal." },
      { status: 403 },
    );
  }

  const session = await getSession();
  session.isLoggedIn = true;
  session.token = token;
  session.userGuid = user_guid;
  session.playerGuid = player_guid;
  session.username = username;
  session.codename = codename;
  session.roleName = role_name;
  await session.save();

  return NextResponse.json({ ok: true });
}
