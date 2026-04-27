import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import CheatDetectionView from "./CheatDetectionView";

export default async function CheatDetectionPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Cheat Detection</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Define visual indicators and use AI to flag suspicious screenshots automatically.
      </p>
      <CheatDetectionView />
    </div>
  );
}
