"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { isUnsafeHwid } from "@/lib/unsafeHwids";

/* ── Types ─────────────────────────────────────────────────── */
type SearchMode = "guid" | "hash" | "description";

type HwidRow = {
  id: number;
  type: string;
  hash: string;
  description: string | null;
  created_at: string;
  last_seen: string;
  is_banned: boolean;
  banned_hwid_id: number | null;
  player_guid: string | null;
};

type BannedHwid = {
  id: number;
  type: string;
  hash: string;
  description: string | null;
  banned_date: string;
  notes: string | null;
  player_guid: string | null;
  codename: string | null;
};

type DetectionRecord = {
  id: number;
  player_guid: string;
  flag: string;
  action: string;
  description: string | null;
  date: string;
};

/* ── HWID type labels & pastel colors ───────────────────────── */
const HWID_TYPE_LABEL: Record<string, string> = {
  "1": "MAC",
  "2": "MOBO",
  "3": "CPU",
  "4": "DISK",
  "5": "GPU",
  "6": "MONITOR",
  "7": "TPM",
  "8": "UUID",
};

function hwidType(type: string): string {
  return HWID_TYPE_LABEL[type] ?? type;
}

type TypeColor = { badge: string; text: string; rowBg: string };

const HWID_TYPE_COLORS: Record<string, TypeColor> = {
  "1": { badge: "border-sky-400/60 text-sky-300",        text: "text-sky-300",        rowBg: "bg-sky-900/25"     }, // MAC
  "2": { badge: "border-violet-400/60 text-violet-300",  text: "text-violet-300",     rowBg: "bg-violet-900/25"  }, // MOBO
  "3": { badge: "border-emerald-400/60 text-emerald-300",text: "text-emerald-300",    rowBg: "bg-emerald-900/25" }, // CPU
  "4": { badge: "border-orange-400/60 text-orange-300",  text: "text-orange-300",     rowBg: "bg-orange-900/25"  }, // DISK
  "5": { badge: "border-pink-400/60 text-pink-300",      text: "text-pink-300",       rowBg: "bg-pink-900/25"    }, // GPU
  "6": { badge: "border-teal-400/60 text-teal-300",      text: "text-teal-300",       rowBg: "bg-teal-900/25"    }, // MONITOR
  "7": { badge: "border-yellow-400/60 text-yellow-300",  text: "text-yellow-300",     rowBg: "bg-yellow-900/25"  }, // TPM
  "8": { badge: "border-indigo-400/60 text-indigo-300",  text: "text-indigo-300",     rowBg: "bg-indigo-900/25"  }, // UUID
};
const DEFAULT_TYPE_COLOR: TypeColor = { badge: "border-[var(--border)]", text: "", rowBg: "" };

function typeColor(type: string): TypeColor {
  return HWID_TYPE_COLORS[type] ?? DEFAULT_TYPE_COLOR;
}

/* ── HWID deduplication & change detection ──────────────────── */

/**
 * If two rows share the same hash AND description (across different types),
 * keep only the one with the most recent last_seen.
 */
function deduplicateHwids(hwids: HwidRow[]): HwidRow[] {
  const map = new Map<string, HwidRow>();
  for (const h of hwids) {
    // Scope dedup per player so hash/description searches don't merge different players
    const key = `${h.player_guid ?? ""}|||${h.hash}|||${h.description ?? ""}`;
    const existing = map.get(key);
    if (!existing || new Date(h.last_seen) > new Date(existing.last_seen)) {
      map.set(key, h);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime(),
  );
}

/**
 * Returns a Set of "player|||type|||hash" keys for rows that belong to a
 * (player, type) group with more than one distinct hash value — meaning the
 * hardware identifier changed at some point.
 *
 * DISK (4) and MONITOR (6) are excluded because players legitimately have
 * multiple disks and monitors.
 */
const CHANGE_EXEMPT_TYPES = new Set(["4", "6"]); // DISK, MONITOR

function getChangedRowKeys(hwids: HwidRow[]): Set<string> {
  const groups = new Map<string, Set<string>>();
  for (const h of hwids) {
    if (CHANGE_EXEMPT_TYPES.has(h.type)) continue;   // skip DISK & MONITOR
    const groupKey = `${h.player_guid ?? ""}|||${h.type}`;
    if (!groups.has(groupKey)) groups.set(groupKey, new Set());
    groups.get(groupKey)!.add(h.hash);
  }
  const changedKeys = new Set<string>();
  for (const [groupKey, hashes] of groups) {
    if (hashes.size > 1) {
      const [pguid, type] = groupKey.split("|||");
      for (const hash of hashes) {
        changedKeys.add(`${pguid}|||${type}|||${hash}`);
      }
    }
  }
  return changedKeys;
}

/**
 * Groups deduplicated HWIDs by their last_seen timestamp.
 * All rows with the same last_seen were recorded in the same session.
 * Returns groups sorted newest → oldest.
 */
function groupByLastSeen(hwids: HwidRow[]): Array<{ lastSeen: string; rows: HwidRow[] }> {
  const map = new Map<string, HwidRow[]>();
  for (const h of hwids) {
    if (!map.has(h.last_seen)) map.set(h.last_seen, []);
    map.get(h.last_seen)!.push(h);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([lastSeen, rows]) => ({ lastSeen, rows }));
}

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
  const unsafe = isUnsafeHwid(hwid.hash);
  const [unsafeAck, setUnsafeAck] = useState(false);

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
            <span className="font-mono font-medium">{hwidType(hwid.type)}</span>
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

        {/* ── Unsafe hash warning ── */}
        {unsafe && (
          <div className="mb-4 rounded-md border border-yellow-600/50 bg-yellow-900/20 p-3">
            <div className="flex items-start gap-2">
              <span className="text-yellow-400 text-base mt-0.5">🚨</span>
              <div className="text-xs text-yellow-300 space-y-1">
                <p className="font-semibold">Risky placeholder value detected</p>
                <p className="text-yellow-300/80">
                  <span className="font-mono">{hwid.hash}</span> is a known OEM default or placeholder
                  that may be shared by thousands of devices. Banning it will
                  flag many innocent players.
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={unsafeAck}
                onChange={(e) => setUnsafeAck(e.target.checked)}
                className="mt-0.5 accent-yellow-400 shrink-0"
              />
              <span className="text-xs text-yellow-300/80 group-hover:text-yellow-300 leading-snug">
                I understand this value is shared by many devices and accept the risk of banning innocent players.
              </span>
            </label>
          </div>
        )}

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
            disabled={loading || (unsafe && !unsafeAck)}
            title={unsafe && !unsafeAck ? "Tick the checkbox above to proceed" : undefined}
            className="flex-1 py-2 rounded-md bg-[var(--danger)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
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
  onUnban,
  onNoteUpdated,
}: {
  b: BannedHwid;
  onUnban: (id: number) => void;
  onNoteUpdated: (id: number, notes: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(b.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Sync draft when b.notes changes from outside (e.g. after reload)
  useEffect(() => {
    if (!editing) setDraft(b.notes ?? "");
  }, [b.notes, editing]);

  async function saveNote() {
    setSaving(true);
    try {
      await fetch(`/api/banned-hwid/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: draft }),
      });
      onNoteUpdated(b.id, draft.trim() || null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-t hover:bg-[var(--panel-2)]/50 align-top">
      <td className="px-4 py-2.5 min-w-[140px]">
        {b.codename ? (
          <div>
            <div className="text-sm font-medium text-white">{b.codename}</div>
            {b.player_guid && (
              <div className="flex items-center gap-1 mt-0.5">
                <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[120px]" title={b.player_guid}>
                  {b.player_guid}
                </span>
                <CopyButton text={b.player_guid} />
              </div>
            )}
          </div>
        ) : b.player_guid ? (
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-[var(--text-dim)] truncate max-w-[120px]" title={b.player_guid}>
              {b.player_guid}
            </span>
            <CopyButton text={b.player_guid} />
          </div>
        ) : (
          <span className="text-xs text-[var(--text-dim)]">—</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--panel-2)] border">
          {hwidType(b.type)}
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
                onClick={() => { setEditing(false); setDraft(b.notes ?? ""); }}
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
            {b.notes ? (
              <span className="text-xs text-yellow-300/80 group-hover:text-yellow-300">
                {b.notes}
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

/* ── Action badge (0=No Effect, 1=Disconnected, 2=Banned, 3=HWID Banned) ── */
const DET_ACTION: Record<string, { label: string; className: string }> = {
  "0": { label: "No Effect",    className: "bg-[var(--panel-2)] text-[var(--text-dim)]" },
  "1": { label: "Disconnected", className: "bg-orange-900/20 text-orange-400" },
  "2": { label: "Banned",       className: "bg-[var(--danger)]/20 text-[var(--danger)]" },
  "3": { label: "HWID Banned",  className: "bg-purple-900/20 text-purple-400" },
};

/* ── Per-tab state ──────────────────────────────────────────── */
type ModeState = {
  query:        string;
  hwids:        HwidRow[];
  detections:   DetectionRecord[];
  sessionCount: number;
  loading:      boolean;
  error:        string | null;
  codenames:    Record<string, string | null>; // player_guid → codename
};

const emptyModeState = (): ModeState => ({
  query: "", hwids: [], detections: [], sessionCount: 0, loading: false, error: null, codenames: {},
});

/* ── Batch codename fetcher ─────────────────────────────────── */
async function fetchCodenames(guids: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(guids.filter(Boolean))];
  if (!unique.length) return {};
  const results = await Promise.all(
    unique.map(async (guid) => {
      try {
        const res = await fetch(`/api/player/${guid}`);
        if (!res.ok) return [guid, null] as const;
        const body = await res.json() as { codename?: string | null };
        return [guid, body.codename ?? null] as const;
      } catch {
        return [guid, null] as const;
      }
    }),
  );
  return Object.fromEntries(results);
}

/* ── Main Component ─────────────────────────────────────────── */
export default function HwidManagerView() {
  const [searchMode, setSearchMode] = useState<SearchMode>("guid");

  // Each tab keeps its own input + results independently
  const [modeInputs, setModeInputs] = useState<Record<SearchMode, string>>({
    guid: "", hash: "", description: "",
  });
  const [modeStates, setModeStates] = useState<Record<SearchMode, ModeState>>({
    guid: emptyModeState(), hash: emptyModeState(), description: emptyModeState(),
  });

  const [bannedList, setBannedList] = useState<BannedHwid[]>([]);
  const [bannedLoading, setBannedLoading] = useState(false);
  const [bannedError, setBannedError] = useState<string | null>(null);
  const [bannedSearch, setBannedSearch] = useState("");

  const [confirmTarget, setConfirmTarget] = useState<HwidRow | null>(null);
  const [pendingNote, setPendingNote] = useState("");
  const [banLoading, setBanLoading] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);

  // Convenience alias for the active tab's state
  const ms = modeStates[searchMode];

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

  useEffect(() => { loadBanned(); }, [loadBanned]);

  /* Helpers to update a specific tab's state */
  function setMode(mode: SearchMode, patch: Partial<ModeState>) {
    setModeStates((prev) => ({ ...prev, [mode]: { ...prev[mode], ...patch } }));
  }

  /* Player HWID + Detection lookup */
  async function lookupPlayer(e: React.FormEvent) {
    e.preventDefault();
    const q = modeInputs[searchMode].trim();
    if (!q) return;
    setMode(searchMode, { loading: true, error: null, hwids: [], detections: [] });
    setBanError(null);
    try {
      const enc      = encodeURIComponent(q);
      const paramKey = searchMode === "guid" ? "player_guid"
        : searchMode === "hash" ? "hash" : "description";

      const hwidRes  = await fetch(`/api/hwid?${paramKey}=${enc}`);
      const hwidBody = await hwidRes.json();
      if (!hwidRes.ok) throw new Error(hwidBody.error || `Error ${hwidRes.status}`);

      let detections: DetectionRecord[] = [];
      if (searchMode === "guid") {
        const detRes  = await fetch(`/api/detection-record?player_guid=${enc}`);
        const detBody = await detRes.json();
        if (detRes.ok) detections = detBody.records as DetectionRecord[];
      }

      const hwids = hwidBody.hwids as HwidRow[];

      // Fetch codenames for hash/description results (multiple players visible)
      let codenames: Record<string, string | null> = {};
      if (searchMode !== "guid") {
        const guids = hwids.map((h) => h.player_guid).filter(Boolean) as string[];
        codenames = await fetchCodenames(guids);
      }

      setMode(searchMode, {
        query: q,
        hwids,
        sessionCount: hwidBody.session_count as number,
        detections,
        codenames,
        loading: false,
      });
    } catch (err) {
      setMode(searchMode, { loading: false, error: err instanceof Error ? err.message : "Failed to load." });
    }
  }

  /* Switch to Hash tab and search all players sharing a specific hash */
  function lookupByHash(hash: string) {
    setSearchMode("hash");
    setModeInputs((prev) => ({ ...prev, hash }));
    setBanError(null);
    setMode("hash", { loading: true, error: null, hwids: [], detections: [], query: hash, sessionCount: 0 });
    void (async () => {
      try {
        const enc      = encodeURIComponent(hash);
        const hwidRes  = await fetch(`/api/hwid?hash=${enc}`);
        const hwidBody = await hwidRes.json();
        if (!hwidRes.ok) throw new Error(hwidBody.error || `Error ${hwidRes.status}`);
        const hwids    = hwidBody.hwids as HwidRow[];
        const guids    = hwids.map((h) => h.player_guid).filter(Boolean) as string[];
        const codenames = await fetchCodenames(guids);
        setMode("hash", {
          query:        hash,
          hwids,
          sessionCount: hwidBody.session_count as number,
          detections:   [],
          codenames,
          loading:      false,
        });
      } catch (err) {
        setMode("hash", { loading: false, error: err instanceof Error ? err.message : "Failed to load." });
      }
    })();
  }

  /* Switch to GUID tab and look up a specific player (from hash/desc results) */
  function lookupByGuid(guid: string) {
    setSearchMode("guid");
    setModeInputs((prev) => ({ ...prev, guid }));
    setBanError(null);
    setMode("guid", { loading: true, error: null, hwids: [], detections: [] });
    void (async () => {
      try {
        const enc = encodeURIComponent(guid);
        const [hwidRes, detRes] = await Promise.all([
          fetch(`/api/hwid?player_guid=${enc}`),
          fetch(`/api/detection-record?player_guid=${enc}`),
        ]);
        const hwidBody = await hwidRes.json();
        if (!hwidRes.ok) throw new Error(hwidBody.error || `Error ${hwidRes.status}`);
        const detBody = await detRes.json();
        setMode("guid", {
          query:        guid,
          hwids:        hwidBody.hwids as HwidRow[],
          sessionCount: hwidBody.session_count as number,
          detections:   detRes.ok ? detBody.records as DetectionRecord[] : [],
          loading: false,
        });
      } catch (err) {
        setMode("guid", { loading: false, error: err instanceof Error ? err.message : "Failed to load." });
      }
    })();
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
          id:          confirmTarget.id,
          type:        confirmTarget.type,
          hash:        confirmTarget.hash,
          description: confirmTarget.description ?? undefined,
          notes:       pendingNote.trim() || undefined,
          force:       isUnsafeHwid(confirmTarget.hash) ? true : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      const newBannedId = body.id as number;

      // Update the banned row in whichever tab triggered the ban
      setModeStates((prev) => {
        const updated: Record<SearchMode, ModeState> = { ...prev };
        (Object.keys(updated) as SearchMode[]).forEach((mode) => {
          updated[mode] = {
            ...updated[mode],
            hwids: updated[mode].hwids.map((h) =>
              h.type === confirmTarget.type && h.hash === confirmTarget.hash
                ? { ...h, is_banned: true, banned_hwid_id: newBannedId }
                : h,
            ),
          };
        });
        return updated;
      });

      setConfirmTarget(null);
      setPendingNote("");
      await loadBanned();
    } catch (err) {
      setBanError(err instanceof Error ? err.message : "Ban failed.");
    } finally {
      setBanLoading(false);
    }
  }

  /* Unban — update all tabs so the status badge reflects the change everywhere */
  async function unban(id: number) {
    try {
      const res = await fetch(`/api/banned-hwid/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || `Error ${res.status}`);
      }
      setBannedList((prev) => prev.filter((b) => b.id !== id));
      setModeStates((prev) => {
        const updated: Record<SearchMode, ModeState> = { ...prev };
        (Object.keys(updated) as SearchMode[]).forEach((mode) => {
          updated[mode] = {
            ...updated[mode],
            hwids: updated[mode].hwids.map((h) =>
              h.banned_hwid_id === id ? { ...h, is_banned: false, banned_hwid_id: null } : h,
            ),
          };
        });
        return updated;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unban failed.");
    }
  }

  // Process active tab's lookup results
  const displayHwids  = deduplicateHwids(ms.hwids);
  const changedKeys   = getChangedRowKeys(displayHwids);
  const sessionGroups = groupByLastSeen(displayHwids);
  const colCount      = searchMode !== "guid" ? 8 : 7;

  const filteredBanned = bannedList.filter((b) => {
    const q = bannedSearch.toLowerCase();
    if (!q) return true;
    return (
      (b.codename ?? "").toLowerCase().includes(q) ||
      (b.player_guid ?? "").toLowerCase().includes(q) ||
      b.type.toLowerCase().includes(q) ||
      hwidType(b.type).toLowerCase().includes(q) ||
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

        {/* Search mode toggle */}
        <div className="flex gap-1 mb-2">
          {(["guid", "hash", "description"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSearchMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                searchMode === mode
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-white border border-[var(--border)]"
              }`}
            >
              {mode === "guid" ? "Player GUID" : mode === "hash" ? "Hash" : "Description"}
            </button>
          ))}
        </div>

        <form onSubmit={lookupPlayer} className="flex gap-2 mb-4">
          <input
            type="text"
            value={modeInputs[searchMode]}
            onChange={(e) => setModeInputs((prev) => ({ ...prev, [searchMode]: e.target.value }))}
            placeholder={
              searchMode === "guid"        ? "Enter player GUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)" :
              searchMode === "hash"        ? "Enter exact HWID hash…" :
                                             "Search description…"
            }
            spellCheck={false}
            className="flex-1 bg-[var(--panel)] border rounded-lg px-4 py-2.5 text-sm font-mono placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            disabled={ms.loading || !modeInputs[searchMode].trim()}
            className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            {ms.loading ? "Looking up…" : "Lookup"}
          </button>
          {(ms.query || ms.hwids.length > 0) && (
            <button
              type="button"
              onClick={() => {
                setModeInputs((prev) => ({ ...prev, [searchMode]: "" }));
                setMode(searchMode, emptyModeState());
                setBanError(null);
              }}
              className="px-4 py-2.5 rounded-lg border border-[var(--border)] text-sm text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
            >
              Clear
            </button>
          )}
        </form>

        {ms.error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-4">
            {ms.error}
          </div>
        )}

        {banError && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-4">
            {banError}
          </div>
        )}

        {ms.query && !ms.loading && (
          <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-[var(--panel-2)] flex items-center justify-between text-sm">
              <span>
                <span className="font-mono text-xs text-[var(--text-dim)]">{ms.query}</span>
                {" — "}
                <span className="font-medium">{ms.hwids.length}</span> HWID{ms.hwids.length !== 1 ? "s" : ""}
                {searchMode === "guid" ? (
                  <> across <span className="font-medium">{ms.sessionCount}</span> session{ms.sessionCount !== 1 ? "s" : ""}</>
                ) : (
                  <> across <span className="font-medium">{ms.sessionCount}</span> player{ms.sessionCount !== 1 ? "s" : ""}</>
                )}
              </span>
            </div>

            {displayHwids.length === 0 ? (
              <div className="px-4 py-10 text-center text-[var(--text-dim)] text-sm">
                No hardware IDs found for this player.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                    <tr>
                      {searchMode !== "guid" && (
                        <th className="px-4 py-2.5 text-left">Player</th>
                      )}
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
                    {sessionGroups.map((group, gi) => (
                      <Fragment key={group.lastSeen}>

                        {/* ── Thick separator between session groups ── */}
                        {gi > 0 && (
                          <tr>
                            <td colSpan={colCount} className="p-0 border-t-[3px] border-[var(--border)]" />
                          </tr>
                        )}

                        {/* ── Session header row ── */}
                        <tr className="bg-[var(--panel-2)]/70 select-none">
                          <td colSpan={colCount} className="px-4 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                                Session
                              </span>
                              <span className="text-[10px] text-[var(--text-dim)]/50">·</span>
                              <span className="text-[10px] font-mono text-[var(--text-dim)]">
                                {fmtDate(group.lastSeen)}
                              </span>
                              {gi === 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)]/20 text-[var(--accent)] font-medium">
                                  Latest
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── HWID rows for this session ── */}
                        {group.rows.map((h, i) => {
                          const rowKey  = `${h.player_guid ?? ""}|||${h.type}|||${h.hash}`;
                          const changed = changedKeys.has(rowKey);
                          const color   = typeColor(h.type);
                          return (
                            <tr
                              key={`${h.type}-${h.hash}-${gi}-${i}`}
                              className={`border-t border-[var(--border)]/40 transition-colors ${
                                h.is_banned
                                  ? "bg-red-950/20 hover:bg-red-950/30"
                                  : "hover:bg-[var(--panel-2)]/50"
                              }`}
                            >
                              {searchMode !== "guid" && (
                                <td className="px-4 py-2.5 min-w-[160px]">
                                  {h.player_guid ? (
                                    <div className="flex flex-col gap-0.5">
                                      {ms.codenames[h.player_guid] && (
                                        <div className="text-xs font-semibold text-white truncate max-w-[150px]" title={ms.codenames[h.player_guid]!}>
                                          {ms.codenames[h.player_guid]}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[110px]" title={h.player_guid}>
                                          {h.player_guid}
                                        </span>
                                        <CopyButton text={h.player_guid} />
                                      </div>
                                      <button
                                        onClick={() => lookupByGuid(h.player_guid!)}
                                        className="text-[10px] text-[var(--accent)] hover:underline text-left"
                                      >
                                        Full lookup ↗
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-[var(--text-dim)]">—</span>
                                  )}
                                </td>
                              )}

                              {/* Type badge — always pastel color */}
                              <td className="px-4 py-2.5">
                                <span className={`text-xs font-mono px-2 py-0.5 rounded bg-[var(--panel-2)] border ${color.badge}`}>
                                  {hwidType(h.type)}
                                </span>
                              </td>

                              {/* Hash — warning icon when value changed across sessions */}
                              <td className="px-4 py-2.5 max-w-[200px]">
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs truncate" title={h.hash}>
                                    {h.hash}
                                  </span>
                                  {changed && (
                                    <span
                                      title={`${hwidType(h.type)} value differs between sessions — possible hardware swap or spoofing`}
                                      className="shrink-0 text-yellow-400 text-xs leading-none"
                                    >
                                      ⚠
                                    </span>
                                  )}
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
                                <div className="flex flex-col gap-1">
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
                                  <button
                                    onClick={() => lookupByHash(h.hash)}
                                    title="Find all players using this exact hash"
                                    className="text-xs px-3 py-1 rounded border border-sky-500/40 text-sky-400 hover:bg-sky-900/20 transition-colors"
                                  >
                                    Find Dupes
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Legend — only when changed values exist */}
                {changedKeys.size > 0 && (
                  <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--panel-2)]/50 text-[10px] text-[var(--text-dim)] flex items-center gap-1.5">
                    <span>Highlighted rows indicate a hardware identifier whose value differs between sessions — possible hardware swap or spoofing.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Detection Records — GUID tab only */}
        {ms.query && searchMode === "guid" && !ms.loading && (
          <div className="mt-6 bg-[var(--panel)] border rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b bg-[var(--panel-2)] flex items-center justify-between text-sm">
              <span>
                Detection Records
                <span className="ml-2 text-[var(--text-dim)] text-xs">
                  {ms.detections.length} record{ms.detections.length !== 1 ? "s" : ""}
                </span>
              </span>
            </div>
            {ms.detections.length === 0 ? (
              <div className="px-4 py-8 text-center text-[var(--text-dim)] text-sm">
                No detection records found for this player.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                    <tr>
                      <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                      <th className="px-4 py-2.5 text-left">Flag</th>
                      <th className="px-4 py-2.5 text-left">Action</th>
                      <th className="px-4 py-2.5 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ms.detections.map((d) => (
                      <tr key={d.id} className="border-t hover:bg-[var(--panel-2)]/50">
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(d.date)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-yellow-900/20 text-yellow-300 border border-yellow-700/30">
                            {d.flag}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {(() => {
                            const entry = DET_ACTION[d.action] ?? { label: d.action || "—", className: "bg-[var(--panel-2)] text-[var(--text-dim)]" };
                            return (
                              <span className={`text-xs px-2 py-0.5 rounded ${entry.className}`}>
                                {entry.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] max-w-sm">
                          <div className="truncate" title={d.description ?? ""}>
                            {d.description ?? "—"}
                          </div>
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
          placeholder="Search by codename, GUID, type, hash or description…"
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
                    <th className="px-4 py-2.5 text-left">Player</th>
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
                      onUnban={unban}
                      onNoteUpdated={(id, updatedNotes) =>
                        setBannedList((prev) =>
                          prev.map((row) => row.id === id ? { ...row, notes: updatedNotes } : row)
                        )
                      }
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
