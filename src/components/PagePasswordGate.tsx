"use client";

import { useEffect, useRef, useState } from "react";

const SESSION_KEY = "ag-page-unlocked";

export default function PagePasswordGate({
  pageKey,
  children,
}: {
  pageKey: string;         // unique key per page, e.g. "topup" or "whitelist"
  children: React.ReactNode;
}) {
  const storageKey = `${SESSION_KEY}:${pageKey}`;
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked]   = useState(false); // hydration guard
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Check sessionStorage after mount (cleared on browser close)
  useEffect(() => {
    if (sessionStorage.getItem(storageKey) === "1") {
      setUnlocked(true);
    }
    setChecked(true);
  }, [storageKey]);

  useEffect(() => {
    if (checked && !unlocked) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [checked, unlocked]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/verify-page-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error ?? "Incorrect password.");
      sessionStorage.setItem(storageKey, "1");
      setUnlocked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect password.");
      setPassword("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  // Don't render anything until hydration check is done (avoids flash)
  if (!checked) return null;

  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--panel)] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🔒</span>
            <div>
              <div className="font-bold text-white">Restricted Page</div>
              <div className="text-xs text-[var(--text-dim)] mt-0.5">
                Enter the page password to continue.
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2.5 bg-[var(--panel-2)] border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]/50"
            />

            {error && (
              <div className="text-sm text-red-400 border border-red-700/40 bg-red-900/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
