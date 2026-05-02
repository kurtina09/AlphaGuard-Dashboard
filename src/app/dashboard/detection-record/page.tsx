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
      <DetectionRecordView />
    </div>
  );
}
