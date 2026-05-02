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

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  form,
  onConfirm,
  onCancel,
  loading,
}: {
  form: FormState;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const actions = [form.kick && "KICK", form.ban && "BAN"].filter(Boolean).join(" + ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-md rounded-xl border border-red-700/60 bg-[var(--panel)] p-6 shadow-2xl mx-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-bold text-red-400">Confirm {actions}</h2>
        </div>

        <div className="space-y-2 mb-5 text-sm">
          <div className="flex gap-2">
            <span className="text-[var(--text-dim)] w-24 shrink-0">Player GUID</span>
            <span className="font-mono text-white break-all">{form.player_guid}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--text-dim)] w-24 shrink-0">Action</span>
            <span className="font-semibold text-red-400">{actions}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--text-dim)] w-24 shrink-0">Reason</span>
            <span className="text-white">{form.reason}</span>
          </div>
        </div>

        {form.ban && (
          <p className="text-xs text-red-400 border border-red-700/40 bg-red-900/20 rounded px-3 py-2 mb-5">
            This will permanently ban the account from logging in. This action cannot be undone from this dashboard.
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-md border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-md bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting…" : `Confirm ${actions}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export default function BanView() {
  const [form, setForm]       = useState<FormState>(DEFAULT);
  const [pending, setPending] = useState<FormState | null>(null); // waiting for confirm
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
    setSuccess(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.kick && !form.ban) {
      setError("Select at least Kick or Ban.");
      return;
    }
    // open confirm modal
    setPending({ ...form });
  }

  async function onConfirm() {
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pending),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);

      const actions = [pending.kick && "Kick", pending.ban && "Ban"].filter(Boolean).join(" + ");
      setSuccess(`${actions} submitted successfully for ${pending.player_guid}.`);
      setForm(DEFAULT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
      setPending(null);
    }
  }

  return (
    <>
      {pending && (
        <ConfirmModal
          form={pending}
          onConfirm={onConfirm}
          onCancel={() => setPending(null)}
          loading={loading}
        />
      )}

      <div className="max-w-xl">
        <form
          onSubmit={onSubmit}
          className="bg-[var(--panel)] border border-[var(--border)] rounded-lg p-6 space-y-5"
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
              className="w-full px-3 py-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
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
              className="w-full px-3 py-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-md text-sm outline-none focus:border-[var(--accent)] resize-none"
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
                <span className="text-yellow-400 font-semibold">Kick</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={form.ban}
                  onChange={(e) => setField("ban", e.target.checked)}
                  className="accent-[var(--accent)] w-4 h-4"
                />
                <span className="text-red-400 font-semibold">Ban</span>
              </label>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Kick removes the player from the current session. Ban prevents future logins.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-red-400 border border-red-700/40 bg-red-900/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="text-sm text-green-400 border border-green-500/40 bg-green-900/20 rounded-md px-3 py-2">
              ✓ {success}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-md bg-red-700 hover:bg-red-600 text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            Submit Action
          </button>
        </form>
      </div>
    </>
  );
}
