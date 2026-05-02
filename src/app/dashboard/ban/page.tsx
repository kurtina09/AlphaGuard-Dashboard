import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import BanView from "./BanView";

export const metadata = { title: "BAN — Account · AlphaGuard" };

export default async function BanPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: "var(--accent)" }}>
        BAN — Account
      </h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Submit a kick or ban action against a player account via the Anti-Cheat API.
      </p>
      <BanView />
    </div>
  );
}
