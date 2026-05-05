"use client";

import { useCallback, useEffect, useState } from "react";
import type { WhitelistEntry } from "@/app/api/whitelist/route";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-white transition-colors"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

function Check({ value }: { value: boolean }) {
  return value ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-900/40 text-green-400 text-sm font-bold">✓</span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[var(--panel-2)] text-[var(--text-dim)] text-sm">✗</span>
  );
}

export default function WhitelistView() {
  const [entries, setEntries]     = useState<WhitelistEntry[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState("");

  // form
  const [guid, setGuid]           = useState("");
  const [screenshot, setScreenshot] = useState(false);
  const [detection, setDetection] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whitelist");
      const body = await res.json() as { entries?: WhitelistEntry[]; error?: string };
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setEntries(body.entries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_guid: guid.trim(), screenshot, detection }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setFormSuccess(`${guid.trim()} added to whitelist.`);
      setGuid("");
      setScreenshot(false);
      setDetection(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to add.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(playerGuid: string) {
    try {
      const res = await fetch("/api/whitelist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_guid: playerGuid }),
      });
      const body = await res.json() as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`);
      setEntries((prev) => prev.filter((e) => e.player_guid !== playerGuid));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to remove.");
    }
  }

  const filtered = entries.filter((e) =>
    !search || e.player_guid.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl">

      {/* ── Add form ── */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-4">
          Add to Whitelist
        </h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
            <input
              type="text"
              value={guid}
              onChange={(e) => { setGuid(e.target.value); setFormError(null); setFormSuccess(null); }}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              required
              spellCheck={false}
              className="w-full px-3 py-2 bg-[var(--panel-2)] border border-[var(--border)] rounded-md text-sm font-mono outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]/50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-[var(--text-dim)]">Whitelist Type</label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={screenshot}
                  onChange={(e) => setScreenshot(e.target.checked)}
                  className="accent-[var(--accent)] w-4 h-4"
                />
                <span className="text-green-400 font-medium">Screenshot</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm">
                <input
                  type="checkbox"
                  checked={detection}
                  onChange={(e) => setDetection(e.target.checked)}
                  className="accent-[var(--accent)] w-4 h-4"
                />
                <span className="text-green-400 font-medium">Detection</span>
              </label>
            </div>
            <p className="text-xs text-[var(--text-dim)]">
              Select one or both. Whitelisted players are excluded from the selected systems.
            </p>
          </div>

          {formError && (
            <div className="text-sm text-red-400 border border-red-700/40 bg-red-900/20 rounded px-3 py-2">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="text-sm text-green-400 border border-green-700/40 bg-green-900/20 rounded px-3 py-2">
              ✓ {formSuccess}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="self-start px-5 py-2 rounded-md text-sm font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Adding…" : "Add to Whitelist"}
          </button>
        </form>
      </div>

      {/* ── List ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-dim)]">
            Whitelisted Players
            {entries.length > 0 && (
              <span className="ml-2 normal-case text-xs font-normal">({entries.length})</span>
            )}
          </h2>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-white disabled:opacity-40 transition-colors"
          >
            {loading ? "Loading…" : "↻ Refresh"}
          </button>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by player GUID…"
          className="w-full mb-3 px-3 py-2 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]/50"
        />

        {error && (
          <div className="text-sm text-red-400 mb-3">{error}</div>
        )}

        <div className="rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--panel-2)] border-b border-[var(--border)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Player GUID</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Screenshot</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Detection</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading && entries.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-[var(--text-dim)] text-sm">Loading…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-[var(--text-dim)] text-sm">
                    {search ? `No entries match "${search}".` : "No whitelisted players yet."}
                  </td>
                </tr>
              )}
              {filtered.map((entry) => (
                <tr key={entry.player_guid} className="border-t border-[var(--border)] hover:bg-[var(--panel-2)]/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center font-mono text-xs">
                      <span>{entry.player_guid}</span>
                      <CopyBtn text={entry.player_guid} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Check value={entry.screenshot} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <Check value={entry.detection} />
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => void remove(entry.player_guid)}
                      className="text-xs px-3 py-1 rounded border border-[var(--text-dim)]/30 text-[var(--text-dim)] hover:text-red-400 hover:border-red-700 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
