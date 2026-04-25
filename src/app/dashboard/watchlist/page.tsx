import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import WatchlistView from "./WatchlistView";

export default async function WatchlistPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Watch List</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Track suspicious players for closer monitoring.
      </p>
      <WatchlistView />
    </div>
  );
}
