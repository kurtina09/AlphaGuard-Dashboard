"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error || "Login failed.");
        return;
      }
      router.replace("/dashboard/detections");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-[var(--panel)] border rounded-lg p-6 space-y-4"
    >
      <div className="space-y-1.5">
        <label className="block text-sm text-[var(--text-dim)]">Username</label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md outline-none focus:border-[var(--accent)]"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm text-[var(--text-dim)]">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md outline-none focus:border-[var(--accent)]"
        />
      </div>
      {error && (
        <div className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-xs text-[var(--text-dim)] text-center">
        Admin access only.
      </p>
    </form>
  );
}
