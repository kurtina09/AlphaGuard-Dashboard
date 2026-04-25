import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import LiveMatchesView from "./LiveMatchesView";

export default async function LiveMatchesPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Search Matches</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Look up a player&apos;s match history by their GUID.
      </p>
      <LiveMatchesView />
    </div>
  );
}
