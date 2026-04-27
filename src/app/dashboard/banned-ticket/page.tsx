import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import BannedTicketView from "./BannedTicketView";

export default async function BannedTicketPage() {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">Banned — Waiting Ticket</h1>
      <p className="text-sm text-[var(--text-dim)] mb-6">
        Track banned players who are pending a ticket review.
      </p>
      <BannedTicketView />
    </div>
  );
}
