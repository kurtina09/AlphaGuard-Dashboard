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

/* ── Transaction type badge ─────────────────────────────────────────────── */
function TxBadge({ type }: { type: string }) {
  const lower = type.toLowerCase();
  let cls = "bg-[var(--panel-2)] text-[var(--text-dim)] border-[var(--border)]";
  if (lower.includes("topup") || lower.includes("payment"))
    cls = "bg-emerald-900/30 text-emerald-400 border-emerald-700/40";
  else if (lower.includes("refund"))
    cls = "bg-red-900/30 text-red-400 border-red-700/40";
  else if (lower.includes("gift") || lower.includes("reward"))
    cls = "bg-violet-900/30 text-violet-400 border-violet-700/40";
  else if (lower.includes("purchase") || lower.includes("buy"))
    cls = "bg-blue-900/30 text-blue-400 border-blue-700/40";
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded border ${cls}`}>
      {type}
    </span>
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

/* ── Pagination ─────────────────────────────────────────────────────────── */
function Pagination({ data, loading, setPage }: {
  data: PageResponse; loading: boolean;
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

/* ── Constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE  = 50;
const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

/* ── Main view ──────────────────────────────────────────────────────────── */
export default function TransactionLogsView() {
  const [page,         setPage]         = useState(0);
  const [txTypeInput,  setTxTypeInput]  = useState("");
  const [txType,       setTxType]       = useState("");
  const [guidInput,    setGuidInput]    = useState("");
  const [playerGuid,   setPlayerGuid]   = useState("");
  const [relatedGuid,  setRelatedGuid]  = useState("");
  const [relatedInput, setRelatedInput] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [data,         setData]         = useState<PageResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [token,        setToken]        = useState<string | null>(null);
  const [codenames,    setCodenames]    = useState<Record<string, string | null>>({});

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
    if (txType)      qs.set("transaction_type", txType);
    if (playerGuid)  qs.set("player_guid",      playerGuid);
    if (relatedGuid) qs.set("related_guid",      relatedGuid);
    if (dateFrom)    qs.set("date_from", dateFrom.split("T")[0]); // $date not $date-time
    if (dateTo)      qs.set("date_to",   dateTo.split("T")[0]);

    try {
      const res  = await fetch(`${WORKER_API}/admin/webtransactionauditlogs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); }
      catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      const pd = body as PageResponse;
      setData(pd);

      const guids = (pd.items ?? [])
        .map((item) => item.player_guid ?? item.playerGuid ?? item.PLAYER_GUID)
        .filter(Boolean) as string[];
      if (guids.length) fetchCodenames(guids).then(setCodenames).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, txType, playerGuid, relatedGuid, dateFrom, dateTo, token]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setTxType(txTypeInput.trim());
    setPlayerGuid(guidInput.trim());
    setRelatedGuid(relatedInput.trim());
    setExpandedRows(new Set());
  }

  function reset() {
    setTxTypeInput("");  setTxType("");
    setGuidInput("");    setPlayerGuid("");
    setRelatedInput(""); setRelatedGuid("");
    setDateFrom("");     setDateTo("");
    setPage(0);          setExpandedRows(new Set());
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
        <form onSubmit={applyFilter} className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border rounded-lg p-4">

          {/* Transaction type */}
          <div className="flex flex-col gap-1 min-w-[180px]">
            <label className="text-xs text-[var(--text-dim)]">Transaction Type</label>
            <input
              type="text"
              value={txTypeInput}
              onChange={(e) => setTxTypeInput(e.target.value)}
              placeholder="e.g. payment_topup"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Player GUID */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
            <input
              type="text"
              value={guidInput}
              onChange={(e) => setGuidInput(e.target.value)}
              placeholder="Player GUID…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] font-mono text-xs"
            />
          </div>

          {/* Related GUID */}
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs text-[var(--text-dim)]">Related GUID</label>
            <input
              type="text"
              value={relatedInput}
              onChange={(e) => setRelatedInput(e.target.value)}
              placeholder="Related GUID…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] font-mono text-xs"
            />
          </div>

          {/* Date from */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">From</label>
            <input type="date" value={dateFrom.split("T")[0] ?? ""} onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Date to */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">To</label>
            <input type="date" value={dateTo.split("T")[0] ?? ""} onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          <button type="submit" disabled={loading}
            className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40">
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
          <div className="mt-2 text-xs text-[var(--text-dim)] px-1">
            {total.toLocaleString()} record{total !== 1 ? "s" : ""}
            {(txType || playerGuid || relatedGuid || dateFrom || dateTo) && " (filtered)"}
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
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No transactions found.</div>
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
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Type</th>
                  <th className="px-4 py-2.5 text-left">Player</th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Related GUID</th>
                  <th className="px-4 py-2.5 text-left">Message</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const date       = pick(item, "date_added", "date", "created_at", "createdAt", "timestamp");
                  const txTypeVal  = pick(item, "transaction_type", "transactionType", "action", "type");
                  const pguid      = pick(item, "player_guid", "playerGuid", "PLAYER_GUID");
                  const rguid      = pick(item, "related_guid", "relatedGuid", "RELATED_GUID");
                  const msg        = pick(item, "message", "description", "log_message", "details");
                  const codename   = pguid !== "—" ? (codenames[pguid] ?? null) : null;
                  const isExpanded = expandedRows.has(idx);

                  return (
                    <>
                      <tr
                        key={`row-${idx}`}
                        onClick={() => toggleRow(idx)}
                        className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${
                          isExpanded ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[var(--text-dim)] text-xs text-center select-none">
                          {isExpanded ? "▾" : "▸"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(date === "—" ? null : date)}
                        </td>

                        {/* Type */}
                        <td className="px-4 py-2.5">
                          {txTypeVal !== "—"
                            ? <TxBadge type={txTypeVal} />
                            : <span className="text-xs text-[var(--text-dim)]">—</span>}
                        </td>

                        {/* Player */}
                        <td className="px-4 py-2.5">
                          {pguid !== "—" ? (
                            <div className="flex flex-col gap-0.5">
                              {codename && (
                                <span className="text-xs font-semibold text-white">{codename}</span>
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

                        {/* Related GUID */}
                        <td className="px-4 py-2.5">
                          {rguid !== "—" ? (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[120px]" title={rguid}>
                                {rguid}
                              </span>
                              <CopyButton text={rguid} />
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>

                        {/* Message */}
                        <td className="px-4 py-2.5 max-w-sm">
                          <div className="text-xs text-[var(--text-dim)] truncate" title={msg !== "—" ? msg : undefined}>
                            {msg}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`exp-${idx}`} className="border-t-0">
                          <td colSpan={6} className="p-0">
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
