"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LogItem = Record<string, any>;

type PageResponse = {
  items?: LogItem[];
  content?: LogItem[];
  data?: LogItem[];
  totalCount?: number;
  total_count?: number;
  totalElements?: number;
  page?: number;
  total_pages?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

/* ── Helpers ────────────────────────────────────────────────────────────── */
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

function PlayerCell({ guid, codename }: { guid: string; codename?: string | null }) {
  if (!codename && (!guid || guid === "—")) return <span className="text-xs text-[var(--text-dim)]">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      {codename && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-white">{codename}</span>
          <CopyButton text={codename} />
        </div>
      )}
      {guid && guid !== "—" && (
        <div className="flex items-center gap-1">
          <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[150px]" title={guid}>
            {guid}
          </span>
          <CopyButton text={guid} />
        </div>
      )}
    </div>
  );
}

/* ── Item type badge ─────────────────────────────────────────────────────── */
const ITEM_TYPES: Record<string, { label: string; cls: string }> = {
  "0": { label: "Weapon", cls: "bg-red-900/30 text-red-400 border-red-700/40" },
  "1": { label: "Armor",  cls: "bg-blue-900/30 text-blue-400 border-blue-700/40" },
  "2": { label: "Item",   cls: "bg-emerald-900/30 text-emerald-400 border-emerald-700/40" },
};

function ItemTypeBadge({ type }: { type: string | null | undefined }) {
  if (type === null || type === undefined) return <span className="text-xs text-[var(--text-dim)]">—</span>;
  const entry = ITEM_TYPES[String(type)];
  if (!entry) return <span className="text-xs font-mono text-[var(--text-dim)]">{type}</span>;
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

/* ── Expanded raw detail ─────────────────────────────────────────────────── */
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
function Pagination({
  page, totalPages, first, last, total, loading, setPage,
}: {
  page: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  total: number;
  loading: boolean;
  setPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const delta = 2;
  const pages: (number | "…")[] = [];
  const rangeStart = Math.max(0, page - delta);
  const rangeEnd   = Math.min(totalPages - 1, page + delta);
  if (rangeStart > 0) { pages.push(0); if (rangeStart > 1) pages.push("…"); }
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < totalPages - 1) { if (rangeEnd < totalPages - 2) pages.push("…"); pages.push(totalPages - 1); }

  return (
    <div className="flex flex-col gap-2 py-3 px-4 border-t border-[var(--border)]">
      <div className="text-xs text-[var(--text-dim)] text-center">
        Page {page + 1} of {totalPages} · {total.toLocaleString()} total
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        <button disabled={first || loading} onClick={() => setPage(Math.max(0, page - 1))}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">‹</button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="px-2 py-1.5 text-[var(--text-dim)]">…</span>
          ) : (
            <button key={p} disabled={loading} onClick={() => setPage(p as number)}
              className={`px-3 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${
                p === page ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "text-[var(--text-dim)] hover:text-white"
              }`}>{(p as number) + 1}</button>
          )
        )}
        <button disabled={last || loading} onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">›</button>
      </div>
    </div>
  );
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE  = 50;
const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

/* ── Main view ──────────────────────────────────────────────────────────── */
export default function ShopLogsView() {
  const [page,         setPage]         = useState(0);
  const [playerInput,  setPlayerInput]  = useState("");
  const [playerFilter, setPlayerFilter] = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [data,         setData]         = useState<PageResponse | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [token,        setToken]        = useState<string | null>(null);

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
    if (playerFilter) qs.set("player_guid", playerFilter);
    if (dateFrom)     qs.set("date_from",   new Date(dateFrom).toISOString());
    if (dateTo)       qs.set("date_to",     new Date(dateTo).toISOString());

    try {
      const res  = await fetch(`${WORKER_API}/admin/shopauditlogs?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); }
      catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      const pageData = body as PageResponse;
      setData(pageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [token, page, playerFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setPlayerFilter(playerInput.trim());
    setExpandedRows(new Set());
  }

  function reset() {
    setPlayerInput(""); setPlayerFilter("");
    setDateFrom("");    setDateTo("");
    setPage(0);         setExpandedRows(new Set());
  }

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any;
  const items: LogItem[] = raw?.items ?? raw?.content ?? raw?.data ?? [];
  const total      = raw?.totalCount ?? raw?.total_count ?? raw?.totalElements ?? 0;
  const totalPages = raw?.total_pages ?? raw?.totalPages ?? 1;
  const curPage    = raw?.page ?? page;
  const isFirst    = raw?.first ?? page === 0;
  const isLast     = raw?.last  ?? page >= totalPages - 1;
  const isFiltered = !!(playerFilter || dateFrom || dateTo);

  return (
    <>
      {/* ── Filter bar ── */}
      <div
        className="sticky -top-4 sm:-top-8 z-50 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-3 pb-4 border-b border-[var(--panel)]"
        style={{ backgroundColor: "#0b0d12", boxShadow: "0 4px 24px 8px #0b0d12" }}
      >
        <form onSubmit={applyFilter} className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border rounded-lg p-4">

          {/* Player GUID */}
          <div className="flex flex-col gap-1 min-w-[220px] flex-1">
            <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
            <input
              type="text"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder="Player GUID…"
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
            {isFiltered && <span className="ml-1 text-[var(--accent)]">(filtered)</span>}
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
      {!loading && !error && data && items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No shop purchase records found.</div>
      )}

      {/* ── Table ── */}
      {!loading && !error && items.length > 0 && (
        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2.5 text-left w-8"></th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                  <th className="px-4 py-2.5 text-left">Player</th>
                  <th className="px-4 py-2.5 text-left">Item</th>
                  <th className="px-4 py-2.5 text-left whitespace-nowrap">Item Type</th>
                  <th className="px-4 py-2.5 text-left">Price</th>
                  <th className="px-4 py-2.5 text-left">Currency</th>
                  <th className="px-4 py-2.5 text-left">Duration</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const date      = item.date ?? item.date_added ?? item.created_at ?? item.createdAt ?? item.timestamp ?? null;
                  const playerGuid= item.player_guid ?? item.playerGuid ?? item.buyer_guid ?? item.buyerGuid ?? item.user_guid ?? item.userGuid ?? "";
                  const codename  = item.codename ?? item.Codename ?? null;
                  const itemName  = item.item_name ?? item.itemName ?? item.shop_item_name ?? item.product_name ?? item.productName ?? item.name ?? "—";
                  const itemType  = item.item_type ?? item.itemType ?? item.type ?? null;
                  const price     = item.bought_for_amount ?? item.boughtForAmount ?? item.price ?? item.cost ?? item.amount ?? null;
                  const currency  = item.money_type_name ?? item.moneyTypeName ?? item.currency ?? item.currency_type ?? null;
                  const duration  = item.duration ?? item.duration_days ?? item.durationDays ?? item.days ?? null;
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
                        {/* Expand */}
                        <td className="px-4 py-2.5 text-[var(--text-dim)] text-xs text-center select-none">
                          {isExpanded ? "▾" : "▸"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(date)}
                        </td>

                        {/* Player */}
                        <td className="px-4 py-2.5">
                          <PlayerCell guid={playerGuid} codename={codename} />
                        </td>

                        {/* Item */}
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-white/80">{itemName}</span>
                        </td>

                        {/* Item Type */}
                        <td className="px-4 py-2.5">
                          <ItemTypeBadge type={itemType !== null ? String(itemType) : null} />
                        </td>

                        {/* Price */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">
                          {price !== null ? String(price) : "—"}
                        </td>

                        {/* Currency */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">
                          {currency !== null ? String(currency) : "—"}
                        </td>

                        {/* Duration */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">
                          {duration !== null
                            ? (Number(duration) === 0 ? "Permanent" : `${duration}d`)
                            : "—"}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`exp-${idx}`} className="border-t-0">
                          <td colSpan={8} className="p-0">
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
          <Pagination
            page={curPage}
            totalPages={totalPages}
            first={isFirst}
            last={isLast}
            total={total}
            loading={loading}
            setPage={(p) => { setPage(p); setExpandedRows(new Set()); }}
          />
        </div>
      )}
    </>
  );
}
