import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import BanView from "./BanView";

export default async function BanPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Ban / Kick Player</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Submit a detection action against a player by their GUID.
      </p>
      <BanView />
    </div>
  );
}
