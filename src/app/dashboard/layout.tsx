import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session.isLoggedIn || !isAdmin(session.roleName)) {
    redirect("/login");
  }
  return (
    <DashboardShell
      codename={session.codename || session.username || "admin"}
      roleName={session.roleName || ""}
    >
      {children}
    </DashboardShell>
  );
}
