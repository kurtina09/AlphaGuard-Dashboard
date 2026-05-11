"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogItem = Record<string, any>;

type PageResponse = {
  items: LogItem[];
  totalCount?: number;
  total_count?: number;
  page: number;
  total_pages: number;
  first: boolean;
  last: boolean;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function pick(item: LogItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
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

/* ── Action badge ────────────────────────────────────────────────────────── */
const ACTION_COLORS: Record<string, string> = {
  ban:    "bg-red-900/30 text-red-400 border-red-700/40",
  unban:  "bg-green-900/30 text-green-400 border-green-700/40",
  kick:   "bg-orange-900/30 text-orange-400 border-orange-700/40",
  update: "bg-blue-900/30 text-blue-400 border-blue-700/40",
  delete: "bg-red-900/30 text-red-400 border-red-700/40",
  create: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40",
  give:   "bg-violet-900/30 text-violet-400 border-violet-700/40",
  gift:   "bg-violet-900/30 text-violet-400 border-violet-700/40",
};

function ActionBadge({ action }: { action: string }) {
  const key = Object.keys(ACTION_COLORS).find((k) =>
    action.toLowerCase().includes(k),
  );
  const cls = key
    ? ACTION_COLORS[key]
    : "bg-[var(--panel-2)] text-[var(--text-dim)] border-[var(--border)]";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {action}
    </span>
  );
}

/* ── Pagination ─────────────────────────────────────────────────────────── */
function Pagination({
  data,
  loading,
  setPage,
}: {
  data: PageResponse;
  loading: boolean;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  const current = data.page;
  const total   = data.total_pages;
  if (total <= 1) return null;

  const delta = 2;
  const pages: (number | "…")[] = [];
  const rangeStart = Math.max(0, current - delta);
  const rangeEnd   = Math.min(total - 1, current + delta);
  if (rangeStart > 0) { pages.push(0); if (rangeStart > 1) pages.push("…"); }
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) { if (rangeEnd < total - 2) pages.push("…"); pages.push(total - 1); }

  return (
    <div className="flex flex-col gap-2 py-3 px-4 border-t border-[var(--border)]">
      <div className="text-xs text-[var(--text-dim)] text-center">
        Page {current + 1} of {total} · {(data.totalCount ?? data.total_count ?? 0).toLocaleString()} total
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        <button
          disabled={data.first || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >‹</button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 py-1.5 text-[var(--text-dim)]">…</span>
          ) : (
            <button
              key={p}
              disabled={loading}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${
                p === current
                  ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                  : "text-[var(--text-dim)] hover:text-white"
              }`}
            >
              {p + 1}
            </button>
          )
        )}
        <button
          disabled={data.last || loading}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >›</button>
      </div>
    </div>
  );
}

/* ── Expandable row detail ───────────────────────────────────────────────── */
function ExpandedDetail({ item }: { item: LogItem }) {
  const entries = Object.entries(item).filter(([, v]) => v !== null && v !== "");
  return (
    <div className="px-4 py-3 bg-[var(--panel-2)]/60 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">{key}</span>
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-xs font-mono break-all text-white/80">
              {typeof value === "object" ? JSON.stringify(value) : String(value)}
            </span>
            {typeof value === "string" && value.length > 4 && (
              <CopyButton text={String(value)} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main view ──────────────────────────────────────────────────────────── */
const PAGE_SIZE = 50;

export default function AdminLogsView() {
  const [page,          setPage]         = useState(0);
  const [searchInput,   setSearchInput]  = useState("");
  const [search,        setSearch]       = useState("");
  const [actionInput,   setActionInput]  = useState("");
  const [action,        setAction]       = useState("");
  const [dateFrom,      setDateFrom]     = useState("");
  const [dateTo,        setDateTo]       = useState("");
  const [data,          setData]         = useState<PageResponse | null>(null);
  const [loading,       setLoading]      = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [expandedRows,  setExpandedRows] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (search)   qs.set("search",    search);
    if (action)   qs.set("action",    action);
    if (dateFrom) qs.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo)   qs.set("date_to",   new Date(dateTo).toISOString());
    try {
      const res  = await fetch(`/api/admin-logs?${qs}`);
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 300)}`);
      }
      const b = body as { error?: string; items?: unknown[] };
      if (!res.ok) throw new Error(b.error || `Error ${res.status}`);
      setData(body as PageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, search, action, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
    setAction(actionInput.trim());
    setExpandedRows(new Set());
  }

  function reset() {
    setSearchInput(""); setSearch("");
    setActionInput(""); setAction("");
    setDateFrom("");    setDateTo("");
    setPage(0);
    setExpandedRows(new Set());
  }

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const total = data?.totalCount ?? data?.total_count ?? 0;

  return (
    <>
      {/* ── Filter bar ── */}
      <div
        className="sticky -top-8 z-50 -mx-8 px-8 pt-11 pb-4 border-b border-[var(--panel)]"
        style={{ backgroundColor: "#0b0d12", boxShadow: "0 4px 24px 8px #0b0d12" }}
      >
        <form
          onSubmit={applyFilter}
          className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border rounded-lg p-4"
        >
          {/* Search */}
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <label className="text-xs text-[var(--text-dim)]">Search message</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Free-text search…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Action */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs text-[var(--text-dim)]">Action</label>
            <input
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              placeholder="e.g. UpdatePlayer"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">From</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">To</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => { setPage(0); load(); }}
            disabled={loading}
            className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </form>

        {/* Row count */}
        {data && !loading && (
          <div className="mt-2 text-xs text-[var(--text-dim)] px-1">
            {total.toLocaleString()} record{total !== 1 ? "s" : ""}
            {(search || action || dateFrom || dateTo) && " (filtered)"}
          </div>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          Loading…
        </div>
      )}
      {!loading && error && (
        <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">
          {error}
        </div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          No log entries found.
        </div>
      )}

      {/* ── Table ── */}
      {!loading && !error && data && data.items.length > 0 && (
        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2.5 text-left w-8"></th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left">Action</th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Object Type</th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Object GUID</th>
                  <th className="px-4 py-2.5 text-left">Staff</th>
                  <th className="px-4 py-2.5 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const date       = pick(item, "date", "created_at", "createdAt", "timestamp", "Date");
                  const actionVal  = pick(item, "action", "Action", "action_type", "actionType");
                  const objType    = pick(item, "object_type", "objectType", "ObjectType");
                  const objGuid    = pick(item, "object_guid", "objectGuid", "ObjectGuid");
                  const userVal    = pick(item, "user", "user_guid", "userGuid", "User", "staff", "admin");
                  const message    = pick(item, "message", "Message", "description", "Description", "details");
                  const isExpanded = expandedRows.has(idx);

                  return (
                    <>
                      <tr
                        key={`row-${idx}`}
                        onClick={() => toggleRow(idx)}
                        className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${
                          isExpanded
                            ? "bg-[var(--panel-2)]"
                            : "hover:bg-[var(--panel-2)]/50"
                        }`}
                      >
                        {/* Expand toggle */}
                        <td className="px-4 py-2.5 text-[var(--text-dim)] text-xs text-center select-none">
                          {isExpanded ? "▾" : "▸"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(date === "—" ? null : date)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-2.5">
                          {actionVal !== "—" ? (
                            <ActionBadge action={actionVal} />
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>

                        {/* Object type */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">
                          {objType}
                        </td>

                        {/* Object GUID */}
                        <td className="px-4 py-2.5">
                          {objGuid !== "—" ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[120px]" title={objGuid}>
                                {objGuid}
                              </span>
                              <CopyButton text={objGuid} />
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>

                        {/* Staff */}
                        <td className="px-4 py-2.5">
                          {userVal !== "—" ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[120px]" title={userVal}>
                                {userVal}
                              </span>
                              <CopyButton text={userVal} />
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>

                        {/* Message */}
                        <td className="px-4 py-2.5 max-w-sm">
                          <div className="text-xs text-[var(--text-dim)] truncate" title={message !== "—" ? message : undefined}>
                            {message}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <tr key={`exp-${idx}`} className="border-t-0">
                          <td colSpan={7} className="p-0">
                            <ExpandedDetail item={item} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination data={data} loading={loading} setPage={(p) => { setPage(p); setExpandedRows(new Set()); }} />
        </div>
      )}
    </>
  );
}
