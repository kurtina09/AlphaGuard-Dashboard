"use client";

import { useState } from "react";

type FormState = {
  player_guid: string;
  reason: string;
  kick: boolean;
  ban: boolean;
};

const DEFAULT: FormState = {
  player_guid: "",
  reason: "",
  kick: false,
  ban: false,
};

export default function BanView() {
  const [form, setForm] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    setSuccess(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!form.kick && !form.ban) {
      setError("Select at least Kick or Ban.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setSuccess(true);
      setForm(DEFAULT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <form
        onSubmit={onSubmit}
        className="bg-[var(--panel)] border rounded-lg p-6 space-y-5"
      >
        {/* Player GUID */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Player GUID</label>
          <input
            type="text"
            value={form.player_guid}
            onChange={(e) => setField("player_guid", e.target.value)}
            placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Reason */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Reason</label>
          <textarea
            value={form.reason}
            onChange={(e) => setField("reason", e.target.value)}
            placeholder="Describe the reason for this action…"
            rows={3}
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Action</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={form.kick}
                onChange={(e) => setField("kick", e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
              <span className="text-yellow-400 font-medium">Kick</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
              <input
                type="checkbox"
                checked={form.ban}
                onChange={(e) => setField("ban", e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4"
              />
              <span className="text-[var(--danger)] font-medium">Ban</span>
            </label>
          </div>
          <p className="text-xs text-[var(--text-dim)]">
            Select one or both. Kick removes the player from the current session; Ban prevents future logins.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">
            Action submitted successfully.
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-[var(--danger)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Submitting…" : "Submit"}
        </button>
      </form>
    </div>
  );
}
