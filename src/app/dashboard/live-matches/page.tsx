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
      <h1 className="text-xl font-semibold mb-4">Live Matches</h1>
      <LiveMatchesView />
    </div>
  );
}
