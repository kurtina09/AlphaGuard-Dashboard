import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.isLoggedIn) redirect("/dashboard/detections");
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-banner.png"
            alt="AlphaGuard Anti-Cheat"
            className="w-full max-w-xs rounded-lg"
          />
          <p className="text-sm text-[var(--text-dim)]">Admin Portal</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
