"use client";

import { useState } from "react";

const SOURCES = ["paymongo", "stripe", "gcash", "maya", "grabpay", "other"];

export default function TopUpView() {
  const [playerGuid, setPlayerGuid] = useState("");
  const [amount, setAmount] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [source, setSource] = useState("paymongo");
  const [customSource, setCustomSource] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const effectiveSource = source === "other" ? customSource.trim() : source;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!effectiveSource) {
      setError("Please specify a source.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerGuid: playerGuid.trim(),
          amount: parseFloat(amount),
          referenceId: referenceId.trim(),
          source: effectiveSource,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setSuccess(true);
      setPlayerGuid("");
      setAmount("");
      setReferenceId("");
      setSource("paymongo");
      setCustomSource("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function clearForm() {
    setPlayerGuid("");
    setAmount("");
    setReferenceId("");
    setSource("paymongo");
    setCustomSource("");
    setError(null);
    setSuccess(false);
  }

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSubmit} className="bg-[var(--panel)] border rounded-lg p-6 space-y-5">

        {/* Player GUID */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Player GUID <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="text"
            value={playerGuid}
            onChange={(e) => { setPlayerGuid(e.target.value); setError(null); setSuccess(false); }}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
            spellCheck={false}
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Amount <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(null); setSuccess(false); }}
            placeholder="200"
            min="1"
            step="1"
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
          <p className="text-xs text-[var(--text-dim)]">In-game currency amount to credit to the player.</p>
        </div>

        {/* Reference ID */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Reference ID <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            type="text"
            value={referenceId}
            onChange={(e) => { setReferenceId(e.target.value); setError(null); setSuccess(false); }}
            placeholder="pay_BtdYs5o3x1ixb3CAtGChzb1w"
            required
            spellCheck={false}
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
          />
          <p className="text-xs text-[var(--text-dim)]">Payment gateway reference / transaction ID.</p>
        </div>

        {/* Source */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">
            Source <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSource(s); setError(null); setSuccess(false); }}
                className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                  source === s
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-white"
                }`}
              >
                {s === "other" ? "Other…" : s}
              </button>
            ))}
          </div>
          {source === "other" && (
            <input
              type="text"
              value={customSource}
              onChange={(e) => setCustomSource(e.target.value)}
              placeholder="Enter source name"
              className="mt-2 w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          )}
        </div>

        {/* Feedback */}
        {error && (
          <div className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">
            ✓ Top-up applied successfully.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
          >
            {submitting ? "Processing…" : "Apply Top-Up"}
          </button>
          <button
            type="button"
            onClick={clearForm}
            disabled={submitting}
            className="px-4 py-2 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
