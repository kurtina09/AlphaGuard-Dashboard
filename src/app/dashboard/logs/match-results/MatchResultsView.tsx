"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MatchItem = Record<string, any>;

type PageResponse = {
  items: MatchItem[];
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

function pick(item: MatchItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
}

function num(item: MatchItem, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return null;
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
    <button onClick={copy}
      className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-transparent text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors">
      {copied ? "✓" : "Copy"}
    </button>
  );
}

/* ── Expandable row detail ───────────────────────────────────────────────── */
function ExpandedDetail({ item }: { item: MatchItem }) {
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
            {typeof value === "string" && value.length > 4 && <CopyButton text={String(value)} />}
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
          p === "…" ? <span key={`e-${i}`} className="px-2 py-1.5 text-[var(--text-dim)]">…</span> : (
            <button key={p} disabled={loading} onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed ${p === current ? "bg-[var(--accent)] text-white border-[var(--accent)]" : "text-[var(--text-dim)] hover:text-white"}`}>
              {p + 1}
            </button>
          )
        )}
        <button disabled={data.last || loading} onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">›</button>
      </div>
    </div>
  );
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const PAGE_SIZE      = 50;
const WORKER_API     = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";
const DEFAULT_BOOST  = 14000;

/* ── Main view ──────────────────────────────────────────────────────────── */
export default function MatchResultsView() {
  const [page,           setPage]          = useState(0);
  const [fromDate,       setFromDate]      = useState("");
  const [toDate,         setToDate]        = useState("");
  const [mode,           setMode]          = useState("");
  const [codenameInput,  setCodenameInput] = useState("");
  const [codename,       setCodename]      = useState("");
  const [guidInput,      setGuidInput]     = useState("");
  const [playerGuid,     setPlayerGuid]    = useState("");
  const [minExp,         setMinExp]        = useState("");
  const [boostThreshold, setBoostThreshold]= useState(String(DEFAULT_BOOST));
  const [boostOnly,      setBoostOnly]     = useState(false);
  const [sort,           setSort]          = useState("date_added");
  const [order,          setOrder]         = useState("desc");
  const [data,           setData]          = useState<PageResponse | null>(null);
  const [loading,        setLoading]       = useState(false);
  const [error,          setError]         = useState<string | null>(null);
  const [expandedRows,   setExpandedRows]  = useState<Set<number>>(new Set());
  const [token,          setToken]         = useState<string | null>(null);

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
    if (fromDate)      qs.set("from_date",       new Date(fromDate).toISOString());
    if (toDate)        qs.set("to_date",          new Date(toDate).toISOString());
    if (mode)          qs.set("mode",             mode);
    if (codename)      qs.set("codename",         codename);
    if (playerGuid)    qs.set("player_guid",      playerGuid);
    if (minExp)        qs.set("min_experience",   minExp);
    if (boostThreshold) qs.set("boost_threshold", boostThreshold);
    if (boostOnly)     qs.set("boost_only",       "true");
    if (sort)          qs.set("sort",             sort);
    if (order)         qs.set("order",            order);

    try {
      const res  = await fetch(`${WORKER_API}/admin/logs/match-results?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); }
      catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setData(body as PageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, fromDate, toDate, mode, codename, playerGuid, minExp, boostThreshold, boostOnly, sort, order, token]);

  useEffect(() => { load(); }, [load]);

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setCodename(codenameInput.trim());
    setPlayerGuid(guidInput.trim());
    setExpandedRows(new Set());
  }

  function reset() {
    setFromDate(""); setToDate(""); setMode("");
    setCodenameInput(""); setCodename("");
    setGuidInput(""); setPlayerGuid("");
    setMinExp(""); setBoostOnly(false);
    setBoostThreshold(String(DEFAULT_BOOST));
    setSort("date_added"); setOrder("desc");
    setPage(0); setExpandedRows(new Set());
  }

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  const total     = data?.totalCount ?? data?.total_count ?? 0;
  const threshold = Number(boostThreshold) || DEFAULT_BOOST;

  return (
    <>
      {/* ── Filter bar ── */}
      <div
        className="sticky -top-8 z-50 -mx-8 px-8 pt-11 pb-4 border-b border-[var(--panel)]"
        style={{ backgroundColor: "#0b0d12", boxShadow: "0 4px 24px 8px #0b0d12" }}
      >
        <form onSubmit={applyFilter} className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border rounded-lg p-4">

          {/* Codename */}
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs text-[var(--text-dim)]">Codename</label>
            <input type="text" value={codenameInput} onChange={(e) => setCodenameInput(e.target.value)}
              placeholder="Search codename…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Player GUID */}
          <div className="flex flex-col gap-1 min-w-[190px]">
            <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
            <input type="text" value={guidInput} onChange={(e) => setGuidInput(e.target.value)}
              placeholder="Player GUID…"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] font-mono text-xs" />
          </div>

          {/* Mode */}
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-[var(--text-dim)]">Mode</label>
            <input type="number" value={mode} onChange={(e) => setMode(e.target.value)}
              placeholder="e.g. 1"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Min EXP */}
          <div className="flex flex-col gap-1 w-28">
            <label className="text-xs text-[var(--text-dim)]">Min EXP</label>
            <input type="number" value={minExp} onChange={(e) => setMinExp(e.target.value)}
              placeholder="0"
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Boost threshold */}
          <div className="flex flex-col gap-1 w-32">
            <label className="text-xs text-[var(--text-dim)]">Boost Threshold</label>
            <input type="number" value={boostThreshold} onChange={(e) => setBoostThreshold(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">From</label>
            <input type="datetime-local" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--text-dim)]">To</label>
            <input type="datetime-local" value={toDate} onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
          </div>

          {/* Sort */}
          <div className="flex flex-col gap-1 w-36">
            <label className="text-xs text-[var(--text-dim)]">Sort By</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]">
              <option value="date_added">Date</option>
              <option value="experience">EXP</option>
              <option value="sp">SP</option>
              <option value="kills">Kills</option>
              <option value="deaths">Deaths</option>
              <option value="headshots">Headshots</option>
            </select>
          </div>

          {/* Order */}
          <div className="flex flex-col gap-1 w-24">
            <label className="text-xs text-[var(--text-dim)]">Order</label>
            <select value={order} onChange={(e) => setOrder(e.target.value)}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          {/* Boost only */}
          <div className="flex flex-col gap-1 justify-end pb-0.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={boostOnly} onChange={(e) => setBoostOnly(e.target.checked)}
                className="accent-[var(--accent)] w-4 h-4" />
              <span className="text-[var(--text-dim)]">Boost only</span>
            </label>
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
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No match results found.</div>
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
                  <th className="px-4 py-2.5 text-left">Player</th>
                  <th className="px-4 py-2.5 text-left">Mode</th>
                  <th className="px-4 py-2.5 text-right">EXP</th>
                  <th className="px-4 py-2.5 text-right">SP</th>
                  <th className="px-4 py-2.5 text-right">Kills</th>
                  <th className="px-4 py-2.5 text-right">Deaths</th>
                  <th className="px-4 py-2.5 text-right">HS</th>
                  <th className="px-4 py-2.5 text-center">Boost</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => {
                  const date      = pick(item, "date_added", "date", "created_at", "createdAt");
                  const codename  = pick(item, "codename", "Codename", "player_codename");
                  const pguid     = pick(item, "player_guid", "playerGuid");
                  const modeVal   = pick(item, "mode", "Mode", "game_mode");
                  const exp       = num(item, "experience", "exp", "Experience");
                  const sp        = num(item, "sp", "SP");
                  const kills     = num(item, "kills", "Kills");
                  const deaths    = num(item, "deaths", "Deaths");
                  const hs        = num(item, "headshots", "Headshots", "hs");
                  const isBoosted = exp !== null && exp >= threshold;
                  const isExpanded= expandedRows.has(idx);

                  return (
                    <>
                      <tr
                        key={`row-${idx}`}
                        onClick={() => toggleRow(idx)}
                        className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${
                          isBoosted
                            ? isExpanded ? "bg-amber-900/20" : "hover:bg-amber-900/10"
                            : isExpanded ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"
                        }`}
                      >
                        <td className="px-4 py-2.5 text-[var(--text-dim)] text-xs text-center select-none">
                          {isExpanded ? "▾" : "▸"}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                          {fmtDate(date === "—" ? null : date)}
                        </td>

                        {/* Player */}
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            {codename !== "—" && (
                              <span className="text-xs font-semibold text-white">{codename}</span>
                            )}
                            {pguid !== "—" && (
                              <div className="flex items-center gap-1">
                                <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[140px]" title={pguid}>
                                  {pguid}
                                </span>
                                <CopyButton text={pguid} />
                              </div>
                            )}
                            {codename === "—" && pguid === "—" && (
                              <span className="text-xs text-[var(--text-dim)]">—</span>
                            )}
                          </div>
                        </td>

                        {/* Mode */}
                        <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">{modeVal}</td>

                        {/* EXP */}
                        <td className={`px-4 py-2.5 text-xs text-right font-mono ${isBoosted ? "text-amber-400 font-semibold" : "text-[var(--text-dim)]"}`}>
                          {exp !== null ? exp.toLocaleString() : "—"}
                        </td>

                        {/* SP */}
                        <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">
                          {sp !== null ? sp.toLocaleString() : "—"}
                        </td>

                        {/* Kills */}
                        <td className="px-4 py-2.5 text-xs text-right font-mono text-emerald-400">
                          {kills !== null ? kills.toLocaleString() : "—"}
                        </td>

                        {/* Deaths */}
                        <td className="px-4 py-2.5 text-xs text-right font-mono text-red-400">
                          {deaths !== null ? deaths.toLocaleString() : "—"}
                        </td>

                        {/* Headshots */}
                        <td className="px-4 py-2.5 text-xs text-right font-mono text-blue-400">
                          {hs !== null ? hs.toLocaleString() : "—"}
                        </td>

                        {/* Boost */}
                        <td className="px-4 py-2.5 text-center">
                          {isBoosted ? (
                            <span className="text-xs px-2 py-0.5 rounded border bg-amber-900/30 text-amber-400 border-amber-700/40">
                              ⚡ Boost
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-dim)]">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`exp-${idx}`} className="border-t-0">
                          <td colSpan={10} className="p-0">
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
