"use client";

import { useCallback, useEffect, useState } from "react";

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

/* ── Constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE  = 50;
const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

// SP bug fingerprint — matches all SP COUPON types
const SP_BUG_MESSAGE  = "UseItem failed";
const SP_BUG_KEYWORD  = "SP COUPON";

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmtDate(s: string | null | undefined) {
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

/* ── Expanded row detail ─────────────────────────────────────────────────── */
function ExpandedDetail({ item }: { item: LogItem }) {
  const entries = Object.entries(item).filter(([, v]) => v !== null && v !== "");
  return (
    <div className="px-4 py-3 bg-amber-950/20 border-t border-amber-700/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col">
          <span className="text-[10px] text-amber-400/70 uppercase tracking-wide">{key}</span>
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

/* ── Pagination ─────────────────────────────────────────────────────────── */
function Pagination({
  data, loading, setPage,
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
        <button disabled={data.first || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 py-1.5 text-[var(--text-dim)]">…</span>
          ) : (
            <button key={p} disabled={loading} onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${
                p === current ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "text-[var(--text-dim)] hover:text-white"
              }`}>{p + 1}</button>
          )
        )}
        <button disabled={data.last || loading} onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">›</button>
      </div>
    </div>
  );
}

/* ── Codename fetcher ────────────────────────────────────────────────────── */
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

/* ── Main view ───────────────────────────────────────────────────────────── */
export default function SpBugView() {
  const [page,         setPage]        = useState(0);
  const [playerGuid,   setPlayerGuid]  = useState("");
  const [guidInput,    setGuidInput]   = useState("");
  const [dateFrom,     setDateFrom]    = useState("");
  const [dateTo,       setDateTo]      = useState("");
  const [data,         setData]        = useState<PageResponse | null>(null);
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState<string | null>(null);
  const [expandedRows, setExpandedRows]= useState<Set<number>>(new Set());
  const [token,        setToken]       = useState<string | null>(null);
  const [codenames,    setCodenames]   = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetch("/api/admin-logs")
      .then((r) => r.json())
      .then((b: { token?: string }) => { if (b.token) setToken(b.token); })
      .catch(() => setError("Failed to get session token."));
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    // Always filter to SP bug entries
    qs.set("message", SP_BUG_MESSAGE);
    if (playerGuid) qs.set("player_guid", playerGuid);
    if (dateFrom)   qs.set("date_from", new Date(dateFrom).toISOString());
    if (dateTo)     qs.set("date_to",   new Date(dateTo).toISOString());

    try {
      const res  = await fetch(`${WORKER_API}/admin/systemlogs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); }
      catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      const page_data = body as PageResponse;

      // Client-side filter: only keep entries that also contain the specific item guid
      const filtered: PageResponse = {
        ...page_data,
        items: (page_data.items ?? []).filter((item) => {
          const msg = String(item.message ?? item.Message ?? item.description ?? item.log_message ?? "");
          return msg.includes(SP_BUG_KEYWORD);
        }),
      };
      setData(filtered);

      const guids = (filtered.items ?? [])
        .map((item) => item.player_guid ?? item.playerGuid ?? item.PLAYER_GUID)
        .filter(Boolean) as string[];
      if (guids.length) fetchCodenames(guids).then(setCodenames).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, playerGuid, dateFrom, dateTo, token]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setPlayerGuid(guidInput.trim());
    setExpandedRows(new Set());
  }

  function reset() {
    setGuidInput(""); setPlayerGuid("");
    setDateFrom("");  setDateTo("");
    setPage(0);       setExpandedRows(new Set());
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
      {/* ── Bug banner ── */}
      <div className="flex items-start gap-3 bg-amber-950/30 border border-amber-700/40 rounded-lg px-4 py-3 mb-2">
        <span className="text-amber-400 text-lg leading-none mt-0.5">⚠</span>
        <div>
          <div className="text-sm font-semibold text-amber-300">500 SP Coupon — UseItem Bug</div>
          <div className="text-xs text-amber-400/70 mt-0.5">
            Showing system logs where <span className="font-mono">UseItem failed</span> and item guid is{" "}
            message contains <span className="font-mono">{SP_BUG_KEYWORD}</span> (all SP Coupon types).
          </div>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div
        className="sticky -top-4 sm:-top-8 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-3 pb-4 border-b border-[var(--panel)]"
        style={{ backgroundColor: "#0b0d12", boxShadow: "0 4px 24px 8px #0b0d12" }}
      >
        <form onSubmit={applyFilter} className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border border-amber-700/20 rounded-lg p-4">

          {/* Player GUID */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
            <input
              type="text"
              value={guidInput}
              onChange={(e) => setGuidInput(e.target.value)}
              placeholder="Filter by player GUID…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] font-mono text-xs"
            />
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">From</label>
            <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">To</label>
            <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          <button type="submit" disabled={loading}
            className="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm disabled:opacity-40">
            Filter
          </button>
          <button type="button" onClick={reset}
            className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white">
            Reset
          </button>
          <button type="button" onClick={() => { setPage(0); load(); }} disabled={loading}
            className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </form>

        {data && !loading && (
          <div className="mt-2 text-xs text-amber-400/80 px-1">
            {total.toLocaleString()} record{total !== 1 ? "s" : ""} · {data.items.length} on this page
            {(playerGuid || dateFrom || dateTo) && " (filtered)"}
          </div>
        )}
      </div>

      {/* ── States ── */}
      {loading && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">Loading…</div>
      )}
      {!loading && error && (
        <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">{error}</div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No SP bug entries found.</div>
      )}

      {/* ── Table ── */}
      {!loading && !error && data && data.items.length > 0 && (
        <div className="bg-[var(--panel)] border border-amber-700/20 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-950/30 text-xs text-amber-300/70">
                <tr>
                  <th className="px-4 py-2.5 text-left w-8"></th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left">Player</th>
                  <th className="px-4 py-2.5 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const date      = item.date_added ?? item.date ?? item.created_at ?? item.createdAt ?? item.timestamp ?? null;
                  const pguid     = item.player_guid ?? item.playerGuid ?? item.PLAYER_GUID ?? "";
                  const msg       = item.message ?? item.Message ?? item.description ?? item.log_message ?? "";
                  const codename  = pguid ? (codenames[pguid] ?? null) : null;
                  const isExpanded= expandedRows.has(idx);

                  return (
                    <>
                      <tr
                        key={`row-${idx}`}
                        onClick={() => toggleRow(idx)}
                        className={`border-t border-amber-700/20 cursor-pointer transition-colors ${
                          isExpanded
                            ? "bg-amber-950/30"
                            : "hover:bg-amber-950/20"
                        }`}
                      >
                        {/* Expand */}
                        <td className="px-4 py-2.5 text-amber-500/60 text-xs text-center select-none">
                          {isExpanded ? "▾" : "▸"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(date)}
                        </td>

                        {/* Player */}
                        <td className="px-4 py-2.5">
                          {pguid ? (
                            <div className="flex flex-col gap-0.5">
                              {codename && (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-semibold text-white">{codename}</span>
                                  <CopyButton text={codename} />
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[150px]" title={pguid}>
                                  {pguid}
                                </span>
                                <CopyButton text={pguid} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>

                        {/* Message */}
                        <td className="px-4 py-2.5 max-w-sm">
                          <div className="text-xs text-amber-300/80 break-words">
                            {msg || "—"}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`exp-${idx}`} className="border-t-0">
                          <td colSpan={4} className="p-0">
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
