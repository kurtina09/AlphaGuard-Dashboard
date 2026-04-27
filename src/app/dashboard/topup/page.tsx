import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import TopUpView from "./TopUpView";

export default async function TopUpPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Top-Up</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Manually credit in-game currency to a player&apos;s account.
      </p>
      <TopUpView />
    </div>
  );
}
