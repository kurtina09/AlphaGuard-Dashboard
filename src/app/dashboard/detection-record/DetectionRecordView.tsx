"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectionRecord } from "@/app/api/detection-record/route";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(raw: string) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

// ── Action mapping ────────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string, { label: string; className: string }> = {
  "0": { label: "No Effect",   className: "text-[var(--text-dim)]" },
  "1": { label: "Disconnected", className: "text-yellow-400" },
  "2": { label: "Banned",       className: "text-red-400 font-semibold" },
  "3": { label: "HWID Banned",  className: "text-purple-400 font-semibold" },
};

function ActionBadge({ action }: { action: string }) {
  const entry = ACTION_LABEL[action] ?? { label: action, className: "text-[var(--text-dim)]" };
  return <span className={`text-xs ${entry.className}`}>{entry.label}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-white transition-colors shrink-0"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PageData {
  records: DetectionRecord[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  first: boolean;
  last: boolean;
}

// ── Codename fetcher ──────────────────────────────────────────────────────────
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

// ── Main view ─────────────────────────────────────────────────────────────────
export default function DetectionRecordView() {
  const [data, setData]           = useState<PageData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [codenames, setCodenames] = useState<Record<string, string | null>>({});
  const [guidFilter, setGuidFilter] = useState("");
  const [page, setPage]           = useState(0);
  const PAGE_SIZE                 = 100;
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (pg: number, guid: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pg), size: String(PAGE_SIZE) });
      if (guid.trim()) params.set("player_guid", guid.trim());
      const res = await fetch(`/api/detection-record?${params}`);
      const body = await res.json() as PageData & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setData(body);
      // Batch-fetch codenames for all GUIDs on this page
      const guids = (body.records ?? []).map((r) => r.player_guid);
      fetchCodenames(guids).then(setCodenames).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(0, ""); }, [fetchData]);

  function onGuidChange(val: string) {
    setGuidFilter(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchData(0, val), 350);
  }

  function goToPage(pg: number) {
    setPage(pg);
    void fetchData(pg, guidFilter);
  }

  const records    = data?.records ?? [];
  const totalCount = data?.total_count ?? 0;
  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-dim)]">
          {totalCount > 0 && <span>{totalCount.toLocaleString()} total records</span>}
        </p>
        <button
          onClick={() => void fetchData(page, guidFilter)}
          disabled={loading}
          className="px-3 py-1.5 rounded text-sm bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-dim)] hover:text-white disabled:opacity-40 transition-colors"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── Search ── */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Search Player GUID</label>
        <div className="flex gap-2 items-center">
          <input
            value={guidFilter}
            onChange={(e) => onGuidChange(e.target.value)}
            placeholder="Search GUID…"
            className="w-80 rounded border border-[var(--border)] bg-[var(--panel-2)] px-3 py-1.5 text-sm font-mono text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
          {guidFilter && (
            <button
              onClick={() => onGuidChange("")}
              className="text-xs px-2 py-1.5 rounded border border-[var(--border)] text-[var(--text-dim)] hover:text-white transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--panel-2)]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider whitespace-nowrap">Date (PHT)</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Codename</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Player GUID</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider w-36">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[var(--text-dim)]">Loading…</td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[var(--text-dim)]">No records found.</td>
                </tr>
              )}
              {records.map((rec) => (
                <tr key={rec.id} className="border-b border-[var(--border)] hover:bg-[var(--panel-2)] transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap font-mono">
                    {fmt(rec.date)}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap">
                    {codenames[rec.player_guid]
                      ? codenames[rec.player_guid]
                      : <span className="text-[var(--text-dim)] font-normal italic text-xs">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center font-mono text-xs">
                      <span className="truncate max-w-[220px]" title={rec.player_guid}>
                        {rec.player_guid}
                      </span>
                      <CopyBtn text={rec.player_guid} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <ActionBadge action={rec.action} />
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] max-w-sm">
                    {rec.description ?? <span className="opacity-40 italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ── */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
            <span>Page {page + 1} of {totalPages} · {totalCount.toLocaleString()} records</span>
            <div className="flex gap-1">
              <button onClick={() => goToPage(0)} disabled={data.first || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors">«</button>
              <button onClick={() => goToPage(page - 1)} disabled={data.first || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors">‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pg = start + i;
                return (
                  <button key={pg} onClick={() => goToPage(pg)} disabled={loading}
                    className={`px-2 py-1 rounded border transition-colors ${pg === page ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border)] hover:bg-[var(--panel)]"}`}>
                    {pg + 1}
                  </button>
                );
              })}
              <button onClick={() => goToPage(page + 1)} disabled={data.last || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors">›</button>
              <button onClick={() => goToPage(totalPages - 1)} disabled={data.last || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors">»</button>
            </div>
          </div>
        )}

        {loading && records.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--text-dim)] bg-[var(--panel-2)] text-center">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}
