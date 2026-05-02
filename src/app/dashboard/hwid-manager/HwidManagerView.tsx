"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────── */
type HwidRow = {
  id: number;
  type: string;
  hash: string;
  description: string | null;
  created_at: string;
  last_seen: string;
  is_banned: boolean;
  banned_hwid_id: number | null;
};

type BannedHwid = {
  id: number;
  type: string;
  hash: string;
  description: string | null;
  banned_date: string;
};

type HwidNote = {
  banned_hwid_id: number;
  note: string;
  updated_at: string;
};

/* ── Helpers ────────────────────────────────────────────────── */
function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function CopyButton({ text }: { text: string }) {
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
      className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-transparent text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

/* ── Confirm Modal ──────────────────────────────────────────── */
function ConfirmModal({
  hwid,
  note,
  onNoteChange,
  onConfirm,
  onCancel,
  loading,
}: {
  hwid: HwidRow;
  note: string;
  onNoteChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70">
      <div className="bg-[var(--panel)] border border-[var(--danger)]/50 rounded-lg w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-lg font-semibold text-[var(--danger)]">Confirm HWID Ban</h2>
        </div>
        <p className="text-sm text-[var(--text-dim)] mb-4">
          This will immediately add the following hardware ID to the ban list.
          <strong className="text-white"> The player will be unable to enter the game.</strong>
        </p>
        <div className="bg-[var(--panel-2)] rounded-md p-3 space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Type</span>
            <span className="font-mono font-medium">{hwid.type}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-[var(--text-dim)] shrink-0">Hash</span>
            <span className="font-mono text-xs break-all text-right">{hwid.hash}</span>
          </div>
          {hwid.description && (
            <div className="flex justify-between gap-4">
              <span className="text-[var(--text-dim)] shrink-0">Description</span>
              <span className="text-xs text-right">{hwid.description}</span>
            </div>
          )}
        </div>
        <div className="mb-5">
          <label className="block text-xs text-[var(--text-dim)] mb-1.5">
            Internal note <span className="opacity-60">(optional — stored only in dashboard, not in the game database)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. Caught speed hacking on 2025-05-01, reported by player XYZ"
            rows={3}
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm resize-none outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-dim)]/50"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-md bg-[var(--danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Banning…" : "Ban This HWID"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Banned Row with inline note editing ───────────────────── */
function BannedRow({
  b,
  note,
  onUnban,
  onNoteSaved,
}: {
  b: BannedHwid;
  note: HwidNote | null;
  onUnban: (id: number) => void;
  onNoteSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.note ?? "");
  const [saving, setSaving] = useState(false);

  async function saveNote() {
    setSaving(true);
    try {
      await fetch("/api/hwid-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banned_hwid_id: b.id, note: draft }),
      });
      await onNoteSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t hover:bg-[var(--panel-2)]/50 align-top">
      <td className="px-4 py-2.5">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--panel-2)] border">
          {b.type}
        </span>
      </td>
      <td className="px-4 py-2.5 max-w-[200px]">
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs truncate" title={b.hash}>{b.hash}</span>
          <CopyButton text={b.hash} />
        </div>
      </td>
      <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">{b.description ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">{fmtDate(b.banned_date)}</td>
      <td className="px-4 py-2.5 min-w-[200px]">
        {editing ? (
          <div className="flex flex-col gap-1">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              className="w-full px-2 py-1 bg-[var(--panel-2)] border rounded text-xs resize-none outline-none focus:border-[var(--accent)]"
            />
            <div className="flex gap-1">
              <button
                onClick={saveNote}
                disabled={saving}
                className="text-xs px-2 py-0.5 rounded bg-[var(--accent)] text-white disabled:opacity-40"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(note?.note ?? ""); }}
                className="text-xs px-2 py-0.5 rounded border text-[var(--text-dim)] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setEditing(true)}
            className="group cursor-pointer"
            title="Click to edit note"
          >
            {note?.note ? (
              <span className="text-xs text-yellow-300/80 group-hover:text-yellow-300">
                {note.note}
              </span>
            ) : (
              <span className="text-xs text-[var(--text-dim)]/40 group-hover:text-[var(--text-dim)] italic">
                Add note…
              </span>
            )}
          </div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <button
          onClick={() => onUnban(b.id)}
          className="text-xs px-3 py-1 rounded border border-[var(--text-dim)]/30 text-[var(--text-dim)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-colors"
        >
          Unban
        </button>
      </td>
    </tr>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function HwidManagerView() {
  const [guidInput, setGuidInput] = useState("");
  const [searchedGuid, setSearchedGuid] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  const [hwids, setHwids] = useState<HwidRow[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const [bannedList, setBannedList] = useState<BannedHwid[]>([]);
  const [bannedLoading, setBannedLoading] = useState(false);
  const [bannedError, setBannedError] = useState<string | null>(null);
  const [bannedSearch, setBannedSearch] = useState("");

  const [notes, setNotes] = useState<Record<number, HwidNote>>({});
  const [confirmTarget, setConfirmTarget] = useState<HwidRow | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const [banLoading, setBanLoading] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);

  /* Load notes */
  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/hwid-notes");
      const body = await res.json();
      if (res.ok) {
        const map: Record<number, HwidNote> = {};
        for (const n of body.notes as HwidNote[]) map[n.banned_hwid_id] = n;
        setNotes(map);
      }
    } catch {}
  }, []);

  /* Load banned list */
  const loadBanned = useCallback(async () => {
    setBannedLoading(true);
    setBannedError(null);
    try {
      const res = await fetch("/api/banned-hwid");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setBannedList(body.items as BannedHwid[]);
    } catch (err) {
      setBannedError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setBannedLoading(false);
    }
  }, []);

  useEffect(() => { loadBanned(); loadNotes(); }, [loadBanned, loadNotes]);

  /* Player HWID lookup */
  async function lookupPlayer(e: React.FormEvent) {
    e.preventDefault();
    const guid = guidInput.trim();
    if (!guid) return;
    setLookupLoading(true);
    setLookupError(null);
    setHwids([]);
    setBanError(null);
    try {
      const res = await fetch(`/api/hwid?player_guid=${encodeURIComponent(guid)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setHwids(body.hwids as HwidRow[]);
      setSessionCount(body.session_count as number);
      setSearchedGuid(guid);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLookupLoading(false);
    }
  }

  /* Execute ban */
  async function executeBan() {
    if (!confirmTarget) return;
    setBanLoading(true);
    setBanError(null);
    try {
      const res = await fetch("/api/banned-hwid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: confirmTarget.type,
          hash: confirmTarget.hash,
          description: confirmTarget.description ?? undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);

      const newBannedId = body.id as number;

      // Save note if provided (local only, does not touch the game DB)
      if (pendingNote.trim()) {
        await fetch("/api/hwid-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ banned_hwid_id: newBannedId, note: pendingNote.trim() }),
        });
      }

      // Update hwid row in local state
      setHwids((prev) =>
        prev.map((h) =>
          h.type === confirmTarget.type && h.hash === confirmTarget.hash
            ? { ...h, is_banned: true, banned_hwid_id: newBannedId }
            : h,
        ),
      );
      setConfirmTarget(null);
      setPendingNote("");
      await Promise.all([loadBanned(), loadNotes()]);
    } catch (err) {
      setBanError(err instanceof Error ? err.message : "Ban failed.");
    } finally {
      setBanLoading(false);
    }
  }

  /* Unban */
  async function unban(id: number) {
    try {
      const res = await fetch(`/api/banned-hwid/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setBannedList((prev) => prev.filter((b) => b.id !== id));
      // Mark row as unbanned in lookup results if visible
      setHwids((prev) =>
        prev.map((h) => (h.banned_hwid_id === id ? { ...h, is_banned: false, banned_hwid_id: null } : h)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unban failed.");
    }
  }

  const filteredBanned = bannedList.filter((b) => {
    const q = bannedSearch.toLowerCase();
    if (!q) return true;
    return (
      b.type.toLowerCase().includes(q) ||
      b.hash.toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      {confirmTarget && (
        <ConfirmModal
          hwid={confirmTarget}
          note={pendingNote}
          onNoteChange={setPendingNote}
          onConfirm={executeBan}
          onCancel={() => { setConfirmTarget(null); setBanError(null); setPendingNote(""); }}
          loading={banLoading}
        />
      )}

      {/* ── Player HWID Lookup ── */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Player HWID Lookup</h2>
        <form onSubmit={lookupPlayer} className="flex gap-2 mb-4">
          <input
            type="text"
            value={guidInput}
            onChange={(e) => setGuidInput(e.target.value)}
            placeholder="Enter player GUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
            spellCheck={false}
            className="flex-1 bg-[var(--panel)] border rounded-lg px-4 py-2.5 text-sm font-mono placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={lookupLoading || !guidInput.trim()}
            className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {lookupLoading ? "Looking up…" : "Lookup"}
          </button>
        </form>

        {lookupError && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-4">
            {lookupError}
          </div>
        )}

        {banError && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-4">
            {banError}
          </div>
        )}

        {searchedGuid && !lookupLoading && (
          <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-[var(--panel-2)] flex items-center justify-between text-sm">
              <span>
                <span className="font-mono text-xs text-[var(--text-dim)]">{searchedGuid}</span>
                {" — "}
                <span className="font-medium">{hwids.length}</span> unique HWID{hwids.length !== 1 ? "s" : ""}
                {" across "}
                <span className="font-medium">{sessionCount}</span> session{sessionCount !== 1 ? "s" : ""}
              </span>
            </div>

            {hwids.length === 0 ? (
              <div className="px-4 py-10 text-center text-[var(--text-dim)] text-sm">
                No hardware IDs found for this player.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Type</th>
                      <th className="px-4 py-2.5 text-left">Hash</th>
                      <th className="px-4 py-2.5 text-left">Description</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">First Seen</th>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">Last Seen</th>
                      <th className="px-4 py-2.5 text-left">Status</th>
                      <th className="px-4 py-2.5 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hwids.map((h) => (
                      <tr
                        key={`${h.type}-${h.hash}`}
                        className={`border-t transition-colors ${
                          h.is_banned
                            ? "bg-red-950/20 hover:bg-red-950/30"
                            : "hover:bg-[var(--panel-2)]/50"
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--panel-2)] border">
                            {h.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 max-w-[200px]">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs truncate" title={h.hash}>{h.hash}</span>
                            <CopyButton text={h.hash} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] max-w-[160px] truncate">
                          {h.description ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(h.created_at)}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(h.last_seen)}
                        </td>
                        <td className="px-4 py-2.5">
                          {h.is_banned ? (
                            <span className="text-xs px-2 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)] font-medium">
                              Banned
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded bg-green-900/20 text-green-400">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {h.is_banned ? (
                            <button
                              onClick={() => h.banned_hwid_id !== null && unban(h.banned_hwid_id)}
                              className="text-xs px-3 py-1 rounded border border-[var(--text-dim)]/30 text-[var(--text-dim)] hover:text-white hover:border-white transition-colors"
                            >
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmTarget(h)}
                              className="text-xs px-3 py-1 rounded border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 transition-colors"
                            >
                              Ban
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Banned HWID List ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            Banned HWIDs
            {bannedList.length > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--text-dim)]">
                ({bannedList.length})
              </span>
            )}
          </h2>
          <button
            onClick={loadBanned}
            disabled={bannedLoading}
            className="text-xs px-3 py-1.5 rounded border text-[var(--text-dim)] hover:text-white disabled:opacity-40"
          >
            {bannedLoading ? "Loading…" : "Refresh"}
          </button>
        </div>

        <input
          type="text"
          value={bannedSearch}
          onChange={(e) => setBannedSearch(e.target.value)}
          placeholder="Search by type, hash or description…"
          className="w-full mb-3 px-3 py-2 bg-[var(--panel)] border rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
        />

        {bannedError && (
          <div className="text-sm text-[var(--danger)] mb-3">{bannedError}</div>
        )}

        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          {bannedLoading ? (
            <div className="px-4 py-10 text-center text-[var(--text-dim)] text-sm">Loading…</div>
          ) : filteredBanned.length === 0 ? (
            <div className="px-4 py-10 text-center text-[var(--text-dim)] text-sm">
              {bannedSearch ? `No banned HWIDs match "${bannedSearch}".` : "No banned HWIDs yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Type</th>
                    <th className="px-4 py-2.5 text-left">Hash</th>
                    <th className="px-4 py-2.5 text-left">Description</th>
                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Banned Date</th>
                    <th className="px-4 py-2.5 text-left">Internal Note</th>
                    <th className="px-4 py-2.5 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBanned.map((b) => (
                    <BannedRow
                      key={b.id}
                      b={b}
                      note={notes[b.id] ?? null}
                      onUnban={unban}
                      onNoteSaved={loadNotes}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
