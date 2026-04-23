import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/session";
import Nav from "./Nav";

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
    <div className="min-h-screen flex">
      <Nav
        codename={session.codename || session.username || "admin"}
        roleName={session.roleName || ""}
      />
      <main className="flex-1 p-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
