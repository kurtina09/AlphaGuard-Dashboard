"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DetectionRecord } from "@/app/api/detection-record/route";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(raw: string) {
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

const FLAG_COLORS: Record<string, string> = {
  CHEAT:    "bg-red-900/60 text-red-300",
  MACRO:    "bg-orange-900/60 text-orange-300",
  SPEED:    "bg-yellow-900/60 text-yellow-300",
  AIM:      "bg-pink-900/60 text-pink-300",
  INJECT:   "bg-purple-900/60 text-purple-300",
  BYPASS:   "bg-blue-900/60 text-blue-300",
};

const ACTION_COLORS: Record<string, string> = {
  BAN:      "text-red-400",
  KICK:     "text-orange-400",
  WARN:     "text-yellow-400",
  LOG:      "text-blue-400",
  FLAG:     "text-purple-400",
};

function flagClass(flag: string) {
  return FLAG_COLORS[flag.toUpperCase()] ?? "bg-[var(--panel-2)] text-yellow-300";
}
function actionClass(action: string) {
  return ACTION_COLORS[action.toUpperCase()] ?? "text-[var(--text-dim)]";
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
      title="Copy"
      className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-[var(--panel-2)] text-[var(--text-dim)] hover:text-white transition-colors shrink-0"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

// ─── types ───────────────────────────────────────────────────────────────────

interface PageData {
  records: DetectionRecord[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  first: boolean;
  last: boolean;
}

// ─── main view ───────────────────────────────────────────────────────────────

export default function DetectionRecordView() {
  const [data, setData]         = useState<PageData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // filter state
  const [guidFilter, setGuidFilter]     = useState("");
  const [flagFilter, setFlagFilter]     = useState("");
  const [actionFilter, setActionFilter] = useState("");

  // pagination
  const [page, setPage]   = useState(0);
  const PAGE_SIZE         = 50;

  // debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async (pg: number, guid: string, flag: string, action: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        size: String(PAGE_SIZE),
      });
      if (guid.trim())   params.set("player_guid", guid.trim());
      if (flag.trim())   params.set("flag", flag.trim());
      if (action.trim()) params.set("action", action.trim());

      const res = await fetch(`/api/detection-record?${params}`);
      const body = await res.json() as PageData & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Request failed");
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    void fetchData(0, "", "", "");
  }, [fetchData]);

  // debounced filter change
  function handleFilterChange(
    newGuid: string,
    newFlag: string,
    newAction: string,
  ) {
    setGuidFilter(newGuid);
    setFlagFilter(newFlag);
    setActionFilter(newAction);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchData(0, newGuid, newFlag, newAction);
    }, 350);
  }

  function goToPage(pg: number) {
    setPage(pg);
    void fetchData(pg, guidFilter, flagFilter, actionFilter);
  }

  function reset() {
    setGuidFilter("");
    setFlagFilter("");
    setActionFilter("");
    setPage(0);
    void fetchData(0, "", "", "");
  }

  const records   = data?.records ?? [];
  const totalPages = data?.total_pages ?? 1;
  const totalCount = data?.total_count ?? 0;
  const hasFilters = guidFilter || flagFilter || actionFilter;

  return (
    <div className="flex flex-col gap-4">
      {/* ── header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--accent)" }}>
            Detection Records
          </h1>
          <p className="text-xs text-[var(--text-dim)] mt-0.5">
            All entries from the <code className="font-mono">detection_record</code> table
            {totalCount > 0 && <span className="ml-1">— {totalCount.toLocaleString()} total</span>}
          </p>
        </div>
        <button
          onClick={() => void fetchData(page, guidFilter, flagFilter, actionFilter)}
          disabled={loading}
          className="px-3 py-1.5 rounded text-sm bg-[var(--panel-2)] hover:bg-[var(--panel)] border border-[var(--border)] text-[var(--text-dim)] hover:text-white transition-colors disabled:opacity-40"
        >
          {loading ? "Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* ── filters ── */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Player GUID</label>
          <input
            value={guidFilter}
            onChange={(e) => handleFilterChange(e.target.value, flagFilter, actionFilter)}
            placeholder="Search GUID…"
            className="w-52 rounded border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Flag</label>
          <input
            value={flagFilter}
            onChange={(e) => handleFilterChange(guidFilter, e.target.value, actionFilter)}
            placeholder="e.g. CHEAT"
            className="w-36 rounded border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-[var(--text-dim)]">Action</label>
          <input
            value={actionFilter}
            onChange={(e) => handleFilterChange(guidFilter, flagFilter, e.target.value)}
            placeholder="e.g. BAN"
            className="w-36 rounded border border-[var(--border)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-white placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        {hasFilters && (
          <button
            onClick={reset}
            className="self-end px-3 py-1.5 rounded text-sm bg-[var(--panel-2)] border border-[var(--border)] text-[var(--text-dim)] hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── error ── */}
      {error && (
        <div className="rounded border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── table ── */}
      <div className="rounded-lg border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--panel-2)]">
                <th className="text-left px-3 py-2 font-semibold text-[var(--text-dim)] text-xs uppercase tracking-wider whitespace-nowrap">Date (PHT)</th>
                <th className="text-left px-3 py-2 font-semibold text-[var(--text-dim)] text-xs uppercase tracking-wider">Player GUID</th>
                <th className="text-left px-3 py-2 font-semibold text-[var(--text-dim)] text-xs uppercase tracking-wider">Flag</th>
                <th className="text-left px-3 py-2 font-semibold text-[var(--text-dim)] text-xs uppercase tracking-wider">Action</th>
                <th className="text-left px-3 py-2 font-semibold text-[var(--text-dim)] text-xs uppercase tracking-wider">Description</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--text-dim)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && records.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-[var(--text-dim)]">
                    No records found.
                  </td>
                </tr>
              )}
              {records.map((rec) => (
                <tr
                  key={rec.id}
                  className="border-b border-[var(--border)] hover:bg-[var(--panel-2)] transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap text-[var(--text-dim)] font-mono text-xs">
                    {fmt(rec.date)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <div className="flex items-center">
                      <span className="truncate max-w-[200px]" title={rec.player_guid}>
                        {rec.player_guid}
                      </span>
                      <CopyBtn text={rec.player_guid} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${flagClass(rec.flag)}`}>
                      {rec.flag}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-semibold text-xs ${actionClass(rec.action)}`}>
                    {rec.action}
                  </td>
                  <td className="px-3 py-2 text-[var(--text-dim)] text-xs max-w-[320px]">
                    {rec.description ?? <span className="opacity-40 italic">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── pagination ── */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
            <span>
              Page {page + 1} of {totalPages}
              {" · "}
              {totalCount.toLocaleString()} total records
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => goToPage(0)}
                disabled={data.first || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors"
              >
                «
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={data.first || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors"
              >
                ‹
              </button>

              {/* page number buttons — show window of 5 around current */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                const pg = start + i;
                return (
                  <button
                    key={pg}
                    onClick={() => goToPage(pg)}
                    disabled={loading}
                    className={`px-2 py-1 rounded border transition-colors ${
                      pg === page
                        ? "border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--border)] hover:bg-[var(--panel)]"
                    }`}
                  >
                    {pg + 1}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(page + 1)}
                disabled={data.last || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors"
              >
                ›
              </button>
              <button
                onClick={() => goToPage(totalPages - 1)}
                disabled={data.last || loading}
                className="px-2 py-1 rounded border border-[var(--border)] hover:bg-[var(--panel)] disabled:opacity-30 transition-colors"
              >
                »
              </button>
            </div>
          </div>
        )}

        {/* loading overlay on page change */}
        {loading && records.length > 0 && (
          <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--text-dim)] bg-[var(--panel-2)] text-center">
            Loading page {page + 1}…
          </div>
        )}
      </div>
    </div>
  );
}
