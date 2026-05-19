import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import TransactionLogsView from "../logs/transaction-logs/TransactionLogsView";
import PagePasswordGate from "@/components/PagePasswordGate";

export const metadata = { title: "Top-Up Logs — AlphaGuard" };

export default async function TopUpLogsPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="max-w-7xl w-full">
      <PagePasswordGate pageKey="topup-logs">
        <header className="mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold">Top-Up Logs</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Transaction and shop logs for player purchases and top-ups.
          </p>
        </header>
        <TransactionLogsView />
      </PagePasswordGate>
    </div>
  );
}
