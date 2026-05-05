import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import WhitelistView from "./WhitelistView";
import PagePasswordGate from "@/components/PagePasswordGate";

export const metadata = { title: "Whitelist — AlphaGuard" };

export default async function WhitelistPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PagePasswordGate pageKey="whitelist">
        <h1 className="text-xl font-bold mb-1" style={{ color: "var(--accent)" }}>
          Whitelist
        </h1>
        <p className="text-sm text-[var(--text-dim)] mb-6">
          Players added here are excluded from screenshot capture and/or cheat detection.
        </p>
        <WhitelistView />
      </PagePasswordGate>
    </div>
  );
}
