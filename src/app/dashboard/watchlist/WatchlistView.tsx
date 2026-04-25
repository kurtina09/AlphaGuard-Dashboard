"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: number;
  player_guid: string;
  reason: string;
  added_by: string;
  added_at: string;
};

function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function WatchlistView() {
  const [playerGuid, setPlayerGuid] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<number | null>(null);

  async function loadList() {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetch("/api/watchlist");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setEntries(body.items as Entry[]);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { loadList(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_guid: playerGuid.trim(), reason: reason.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setFormSuccess(true);
      setPlayerGuid("");
      setReason("");
      loadList();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteEntry(id: number) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/watchlist/${id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form
        onSubmit={onSubmit}
        className="bg-[var(--panel)] border rounded-lg p-6 space-y-4 max-w-xl"
      >
        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">
          Add to Watch List
        </h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Player GUID</label>
          <input
            type="text"
            value={playerGuid}
            onChange={(e) => { setPlayerGuid(e.target.value); setFormError(null); setFormSuccess(false); }}
            placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Reason</label>
          <textarea
            value={reason}
            onChange={(e) => { setReason(e.target.value); setFormError(null); setFormSuccess(false); }}
            placeholder="Why is this player being watched?"
            rows={3}
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] resize-none"
          />
        </div>

        {formError && (
          <p className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">
            {formError}
          </p>
        )}
        {formSuccess && (
          <p className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">
            Player added to watch list.
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add to Watch List"}
        </button>
      </form>

      {/* List */}
      <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">
            Watch List
            {entries.length > 0 && (
              <span className="ml-2 text-xs text-[var(--text-dim)]">({entries.length})</span>
            )}
          </h2>
          <button
            onClick={loadList}
            disabled={listLoading}
            className="text-xs px-3 py-1 rounded-md border text-[var(--text-dim)] hover:text-white disabled:opacity-40"
          >
            {listLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {listLoading && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">Loading…</p>
        )}
        {!listLoading && listError && (
          <p className="px-4 py-8 text-center text-sm text-[var(--danger)]">{listError}</p>
        )}
        {!listLoading && !listError && entries.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">No players on the watch list.</p>
        )}
        {!listLoading && entries.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--panel-2)] text-left text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Player GUID</th>
                  <th className="px-4 py-2.5 font-medium">Reason</th>
                  <th className="px-4 py-2.5 font-medium">Added By</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-[var(--panel-2)]/50">
                    <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-dim)]">
                      {e.player_guid}
                    </td>
                    <td className="px-4 py-2.5 max-w-sm">
                      <div className="truncate" title={e.reason}>{e.reason}</div>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-dim)]">{e.added_by || "—"}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-dim)]">
                      {fmtDate(e.added_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => deleteEntry(e.id)}
                        disabled={deleting === e.id}
                        className="text-xs px-3 py-1 rounded-md border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {deleting === e.id ? "…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
