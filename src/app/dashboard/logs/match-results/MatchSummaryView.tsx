"use client";

import { useCallback, useEffect, useState } from "react";

/* ── Types ─────────────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SummaryItem = Record<string, any>;

type GroupBy = "codename" | "mode" | "day";

/* ── Helpers ────────────────────────────────────────────────────────────── */
function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

function fmtDay(s: string | null | undefined) {
  if (!s) return "—";
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleDateString("en-PH", {
    timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", weekday: "short",
  });
}

function pick(item: SummaryItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
}

function getNum(item: SummaryItem, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") {
      const n = Number(v);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function fmt(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString();
}

function kd(kills: number | null, deaths: number | null): string {
  if (kills === null || deaths === null) return "—";
  if (deaths === 0) return kills > 0 ? "∞" : "0.00";
  return (kills / deaths).toFixed(2);
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

/* ── Debug panel: shows raw first item so we can see actual field names ── */
function DebugFirstItem({ item }: { item: SummaryItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-2 border-b border-amber-700/30 bg-amber-900/10 text-xs flex flex-col gap-1">
      <button onClick={() => setOpen((v) => !v)}
        className="text-left text-amber-400/80 hover:text-amber-300 flex items-center gap-1">
        <span>{open ? "▾" : "▸"}</span>
        <span className="font-mono">debug: first row field names</span>
      </button>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-1 mt-1">
          {Object.entries(item).map(([k, v]) => (
            <div key={k} className="flex flex-col">
              <span className="text-amber-400/70 font-mono">{k}</span>
              <span className="text-white/50 font-mono truncate">{v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Expandable row detail ───────────────────────────────────────────────── */
function ExpandedDetail({ item, colSpan }: { item: SummaryItem; colSpan: number }) {
  const entries = Object.entries(item).filter(([, v]) => v !== null && v !== "");
  return (
    <tr>
      <td colSpan={colSpan} className="p-0">
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
      </td>
    </tr>
  );
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

/* ── Main view ──────────────────────────────────────────────────────────── */
export default function MatchSummaryView() {
  const [groupBy,        setGroupBy]        = useState<GroupBy>("codename");
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");
  const [codenameSearch, setCodenameSearch] = useState("");
  const [data,           setData]           = useState<SummaryItem[] | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [token,          setToken]          = useState<string | null>(null);
  const [expandedRows,   setExpandedRows]   = useState<Set<number>>(new Set());

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
    setExpandedRows(new Set());
    const qs = new URLSearchParams({ group_by: groupBy });
    if (fromDate) qs.set("from_date", new Date(fromDate).toISOString());
    if (toDate)   qs.set("to_date",   new Date(toDate).toISOString());

    try {
      const res  = await fetch(`${WORKER_API}/admin/logs/match-results/summary?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); }
      catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }

      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyBody = body as any;
      const items: SummaryItem[] = Array.isArray(body)
        ? body
        : Array.isArray(anyBody.items)   ? anyBody.items
        : Array.isArray(anyBody.data)    ? anyBody.data
        : Array.isArray(anyBody.content) ? anyBody.content
        : Array.isArray(anyBody.results) ? anyBody.results
        : Array.isArray(anyBody.records) ? anyBody.records
        : typeof anyBody === "object" && anyBody !== null
          ? (Object.values(anyBody).find((v) => Array.isArray(v)) as SummaryItem[] ?? [])
          : [];
      setData(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [groupBy, fromDate, toDate, token]);

  useEffect(() => { load(); }, [load]);

  function toggleRow(idx: number) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  // Client-side search (codename mode only)
  const filteredData = data
    ? groupBy === "codename" && codenameSearch.trim()
      ? data.filter((item) => {
          const q = codenameSearch.trim().toLowerCase();
          return Object.values(item).some((v) =>
            typeof v === "string" && v.toLowerCase().includes(q)
          );
        })
      : data
    : null;

  function reset() {
    setFromDate(""); setToDate(""); setGroupBy("codename"); setCodenameSearch("");
  }

  // ── shared stat field name lists (wide net across naming conventions) ──
  const MATCH_KEYS = ["match_count","matchCount","matches","total_matches","totalMatches","count","total","num_matches","numMatches"];
  const EXP_KEYS   = ["total_experience","totalExperience","total_exp","totalExp","experience","exp","xp","total_xp","totalXp"];
  const SP_KEYS    = ["total_sp","totalSp","sp","total_skill_points","totalSkillPoints"];
  const KILL_KEYS  = ["total_kills","totalKills","kills","kill_count","killCount"];
  const DEATH_KEYS = ["total_deaths","totalDeaths","deaths","death_count","deathCount"];
  const HS_KEYS    = ["total_headshots","totalHeadshots","headshots","hs","headshot_count","headshotCount"];

  return (
    <>
      {/* ── Filter bar ── */}
      <div
        className="sticky -top-8 z-50 -mx-8 px-8 pt-11 pb-4 border-b border-[var(--panel)]"
        style={{ backgroundColor: "#0b0d12", boxShadow: "0 4px 24px 8px #0b0d12" }}
      >
        <div className="flex flex-wrap gap-3 items-end bg-[var(--panel)] border rounded-lg p-4">

          {/* Group By */}
          <div className="flex flex-col gap-1 w-44">
            <label className="text-xs text-[var(--text-dim)]">Group By <span className="text-red-400">*</span></label>
            <select value={groupBy} onChange={(e) => { setGroupBy(e.target.value as GroupBy); setExpandedRows(new Set()); }}
              className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]">
              <option value="codename">Codename (per player)</option>
              <option value="mode">Mode (per game mode)</option>
              <option value="day">Day (per day)</option>
            </select>
          </div>

          {/* Codename search — only shown when group_by=codename */}
          {groupBy === "codename" && (
            <div className="flex flex-col gap-1 min-w-[180px]">
              <label className="text-xs text-[var(--text-dim)]">Search Codename</label>
              <input type="text" value={codenameSearch} onChange={(e) => setCodenameSearch(e.target.value)}
                placeholder="Filter by codename or GUID…"
                className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
            </div>
          )}

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

          <button type="button" onClick={() => load()} disabled={loading}
            className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40">
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button type="button" onClick={reset}
            className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white">
            Reset
          </button>
        </div>

        {filteredData && !loading && (
          <div className="mt-2 text-xs text-[var(--text-dim)] px-1">
            {filteredData.length.toLocaleString()}
            {data && filteredData.length !== data.length && (
              <span> of {data.length.toLocaleString()}</span>
            )}
            {" "}group{filteredData.length !== 1 ? "s" : ""} · grouped by{" "}
            <span className="text-white font-medium">{groupBy}</span>
            {codenameSearch.trim() && (
              <span className="ml-2 text-[var(--accent)]">· filtered by &ldquo;{codenameSearch.trim()}&rdquo;</span>
            )}
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
      {!loading && !error && filteredData && filteredData.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          {codenameSearch.trim() && data && data.length > 0
            ? `No players matching "${codenameSearch.trim()}".`
            : "No summary data found."}
        </div>
      )}

      {/* ── Table: per codename (leaderboard) ── */}
      {!loading && !error && filteredData && filteredData.length > 0 && groupBy === "codename" && (() => {
        const COLS = 10; // expand toggle + # + player + matches + exp + sp + kills + deaths + hs + k/d
        return (
          <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
            {/* debug strip — always visible, expand to see field names */}
            <DebugFirstItem item={filteredData[0]} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                  <tr>
                    <th className="px-4 py-2.5 w-8"></th>
                    <th className="px-4 py-2.5 text-center w-10">#</th>
                    <th className="px-4 py-2.5 text-left">Player</th>
                    <th className="px-4 py-2.5 text-right">Matches</th>
                    <th className="px-4 py-2.5 text-right">Total EXP</th>
                    <th className="px-4 py-2.5 text-right">Total SP</th>
                    <th className="px-4 py-2.5 text-right">Kills</th>
                    <th className="px-4 py-2.5 text-right">Deaths</th>
                    <th className="px-4 py-2.5 text-right">HS</th>
                    <th className="px-4 py-2.5 text-right">K/D</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => {
                    const codename = pick(item,
                      "codename","Codename","player_codename","playerCodename",
                      "username","userName","name","player_name","playerName","nickname");
                    const pguid   = pick(item,
                      "player_guid","playerGuid","user_guid","userGuid","guid","playerId","player_id");
                    const matches = getNum(item, ...MATCH_KEYS);
                    const exp     = getNum(item, ...EXP_KEYS);
                    const sp      = getNum(item, ...SP_KEYS);
                    const kills   = getNum(item, ...KILL_KEYS);
                    const deaths  = getNum(item, ...DEATH_KEYS);
                    const hs      = getNum(item, ...HS_KEYS);
                    const kdVal   = kd(kills, deaths);
                    const isExp   = expandedRows.has(idx);

                    return (
                      <>
                        <tr key={`r-${idx}`} onClick={() => toggleRow(idx)}
                          className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${isExp ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"}`}>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] text-center select-none">
                            {isExp ? "▾" : "▸"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-xs text-[var(--text-dim)]">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              {codename !== "—"
                                ? <span className="text-sm font-semibold text-white">{codename}</span>
                                : <span className="text-xs italic text-[var(--text-dim)]">unknown</span>}
                              {pguid !== "—" && (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[140px]" title={pguid}>{pguid}</span>
                                  <CopyButton text={pguid} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(matches)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-amber-400 font-semibold">{fmt(exp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(sp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-emerald-400">{fmt(kills)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-red-400">{fmt(deaths)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-blue-400">{fmt(hs)}</td>
                          <td className={`px-4 py-2.5 text-xs text-right font-mono font-semibold ${
                            kdVal === "∞" || Number(kdVal) >= 3 ? "text-amber-400" :
                            Number(kdVal) >= 1.5 ? "text-emerald-400" :
                            Number(kdVal) >= 1   ? "text-white"      : "text-red-400"
                          }`}>{kdVal}</td>
                        </tr>
                        {isExp && <ExpandedDetail key={`e-${idx}`} item={item} colSpan={COLS} />}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Table: per mode ── */}
      {!loading && !error && filteredData && filteredData.length > 0 && groupBy === "mode" && (() => {
        const COLS = 9;
        return (
          <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
            <DebugFirstItem item={filteredData[0]} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                  <tr>
                    <th className="px-4 py-2.5 w-8"></th>
                    <th className="px-4 py-2.5 text-left">Mode</th>
                    <th className="px-4 py-2.5 text-right">Matches</th>
                    <th className="px-4 py-2.5 text-right">Total EXP</th>
                    <th className="px-4 py-2.5 text-right">Total SP</th>
                    <th className="px-4 py-2.5 text-right">Kills</th>
                    <th className="px-4 py-2.5 text-right">Deaths</th>
                    <th className="px-4 py-2.5 text-right">HS</th>
                    <th className="px-4 py-2.5 text-right">K/D</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => {
                    const modeVal = pick(item,
                      "mode","Mode","game_mode","gameMode","mode_id","modeId","match_mode","matchMode");
                    const matches = getNum(item, ...MATCH_KEYS);
                    const exp     = getNum(item, ...EXP_KEYS);
                    const sp      = getNum(item, ...SP_KEYS);
                    const kills   = getNum(item, ...KILL_KEYS);
                    const deaths  = getNum(item, ...DEATH_KEYS);
                    const hs      = getNum(item, ...HS_KEYS);
                    const kdVal   = kd(kills, deaths);
                    const isExp   = expandedRows.has(idx);

                    return (
                      <>
                        <tr key={`r-${idx}`} onClick={() => toggleRow(idx)}
                          className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${isExp ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"}`}>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] text-center select-none">
                            {isExp ? "▾" : "▸"}
                          </td>
                          <td className="px-4 py-2.5">
                            {modeVal !== "—"
                              ? <span className="px-2 py-0.5 rounded border bg-[var(--panel-2)] text-xs font-mono text-white">Mode {modeVal}</span>
                              : <span className="text-xs italic text-[var(--text-dim)]">unknown</span>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(matches)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-amber-400 font-semibold">{fmt(exp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(sp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-emerald-400">{fmt(kills)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-red-400">{fmt(deaths)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-blue-400">{fmt(hs)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-white font-semibold">{kdVal}</td>
                        </tr>
                        {isExp && <ExpandedDetail key={`e-${idx}`} item={item} colSpan={COLS} />}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ── Table: per day ── */}
      {!loading && !error && filteredData && filteredData.length > 0 && groupBy === "day" && (() => {
        const COLS = 9;
        return (
          <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
            <DebugFirstItem item={filteredData[0]} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                  <tr>
                    <th className="px-4 py-2.5 w-8"></th>
                    <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
                    <th className="px-4 py-2.5 text-right">Matches</th>
                    <th className="px-4 py-2.5 text-right">Total EXP</th>
                    <th className="px-4 py-2.5 text-right">Total SP</th>
                    <th className="px-4 py-2.5 text-right">Kills</th>
                    <th className="px-4 py-2.5 text-right">Deaths</th>
                    <th className="px-4 py-2.5 text-right">HS</th>
                    <th className="px-4 py-2.5 text-right">K/D</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => {
                    const dayVal  = pick(item,
                      "day","Day","date","Date","date_added","dateAdded",
                      "match_date","matchDate","created_at","createdAt","period","timestamp");
                    const matches = getNum(item, ...MATCH_KEYS);
                    const exp     = getNum(item, ...EXP_KEYS);
                    const sp      = getNum(item, ...SP_KEYS);
                    const kills   = getNum(item, ...KILL_KEYS);
                    const deaths  = getNum(item, ...DEATH_KEYS);
                    const hs      = getNum(item, ...HS_KEYS);
                    const kdVal   = kd(kills, deaths);
                    const isExp   = expandedRows.has(idx);

                    const dateDisplay = dayVal === "—" ? "—"
                      : (dayVal.includes("T") || dayVal.match(/^\d{4}-\d{2}-\d{2}/))
                        ? fmtDate(dayVal)
                        : fmtDay(dayVal);

                    return (
                      <>
                        <tr key={`r-${idx}`} onClick={() => toggleRow(idx)}
                          className={`border-t border-[var(--border)]/40 cursor-pointer transition-colors ${isExp ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"}`}>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] text-center select-none">
                            {isExp ? "▾" : "▸"}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">{dateDisplay}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(matches)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-amber-400 font-semibold">{fmt(exp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-[var(--text-dim)]">{fmt(sp)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-emerald-400">{fmt(kills)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-red-400">{fmt(deaths)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-blue-400">{fmt(hs)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono text-white font-semibold">{kdVal}</td>
                        </tr>
                        {isExp && <ExpandedDetail key={`e-${idx}`} item={item} colSpan={COLS} />}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
  );
}
