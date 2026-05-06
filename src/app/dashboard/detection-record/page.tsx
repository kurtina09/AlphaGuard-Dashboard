import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import DetectionRecordView from "./DetectionRecordView";

export const metadata = { title: "Detection Records — AlphaGuard" };

export default async function DetectionRecordPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold mb-1" style={{ color: "var(--accent)" }}>
        Detection Records
      </h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        All entries from <code className="font-mono text-xs">detection_record</code> table.
        Actions: <span className="text-[var(--text-dim)]">0 = No Effect</span> · <span className="text-yellow-400">1 = Disconnected</span> · <span className="text-red-400">2 = Banned</span> · <span className="text-purple-400">3 = HWID Banned</span>
      </p>
      <DetectionRecordView />
    </div>
  );
}
