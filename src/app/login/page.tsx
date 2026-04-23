import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/dashboard/detections");
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">AlphaGuard</h1>
          <p className="text-sm text-[var(--text-dim)] mt-1">
            Anti-Cheat Portal
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
