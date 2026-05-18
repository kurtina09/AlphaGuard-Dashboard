"use client";

import { useEffect, useState, useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>;

const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

/* ── Sub-tabs ────────────────────────────────────────────────────────────── */
type SubTab = "profile" | "weapons" | "items" | "gifts" | "characters" | "icons" | "emblems" | "backgrounds" | "match-stats";

const SUB_TABS: { id: SubTab; label: string; path?: string }[] = [
  { id: "profile",    label: "Profile" },
  { id: "weapons",    label: "Weapons",     path: "weapons" },
  { id: "items",      label: "Items",       path: "items" },
  { id: "gifts",      label: "Gifts",       path: "gifts" },
  { id: "characters", label: "Characters",  path: "characters" },
  { id: "icons",      label: "Icons",       path: "icons" },
  { id: "emblems",    label: "Emblems",     path: "emblems" },
  { id: "backgrounds",label: "Backgrounds", path: "emblem-backgrounds" },
  { id: "match-stats",label: "Match Stats", path: "match-stats" },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-transparent text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  const v = value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="bg-[var(--panel-2)] rounded-md px-3 py-2">
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm font-medium flex-1 break-all ${mono ? "font-mono text-xs" : ""}`}>{v}</span>
        {v !== "—" && v.length > 6 && <CopyButton text={v} />}
      </div>
    </div>
  );
}

function Badge({ label, value }: { label: string; value: boolean | null | undefined }) {
  const active = value === true;
  return (
    <div className="bg-[var(--panel-2)] rounded-md px-3 py-2">
      <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide mb-1">{label}</div>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
        active ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"
      }`}>
        {active ? "Yes" : "No"}
      </span>
    </div>
  );
}

/* ── Action button ───────────────────────────────────────────────────────── */
type ActionState = "idle" | "confirm" | "loading" | "done" | "error";

function ActionButton({ label, description, colorClass, onConfirm }: {
  label: string; description: string; colorClass: string;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [state,  setState]  = useState<ActionState>("idle");
  const [reason, setReason] = useState("");
  const [msg,    setMsg]    = useState("");

  async function execute() {
    setState("loading");
    const err = await onConfirm(reason);
    if (err) { setMsg(err); setState("error"); }
    else     { setMsg("Done."); setState("done"); setTimeout(() => setState("idle"), 3000); }
  }

  if (state === "done")  return <div className="text-xs text-emerald-400 py-1">{msg}</div>;
  if (state === "error") return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-red-400">{msg}</span>
      <button onClick={() => setState("idle")} className="text-xs text-[var(--text-dim)] hover:text-white underline">Retry</button>
    </div>
  );
  if (state === "confirm" || state === "loading") return (
    <div className="flex flex-col gap-2 p-3 border rounded-lg bg-[var(--panel-2)]">
      <div className="text-xs font-semibold text-white">{label} — confirm</div>
      <div className="text-xs text-[var(--text-dim)]">{description}</div>
      <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)…"
        className="px-3 py-1.5 bg-[var(--panel)] border rounded text-sm outline-none focus:border-[var(--accent)]" />
      <div className="flex gap-2">
        <button onClick={execute} disabled={state === "loading"}
          className={`px-4 py-1.5 rounded text-sm text-white font-medium disabled:opacity-50 ${colorClass}`}>
          {state === "loading" ? "Sending…" : "Confirm"}
        </button>
        <button onClick={() => { setState("idle"); setReason(""); }}
          className="px-4 py-1.5 rounded border text-sm text-[var(--text-dim)] hover:text-white">Cancel</button>
      </div>
    </div>
  );
  return (
    <button onClick={() => setState("confirm")}
      className={`px-4 py-2 rounded-md text-sm font-medium text-white transition-opacity hover:opacity-90 ${colorClass}`}>
      {label}
    </button>
  );
}

/* ── Match Stats tab ─────────────────────────────────────────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MatchItem = Record<string, any>;

type DetailTab = "scoreboard" | "weapons" | "rounds" | "killfeed";
const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "scoreboard", label: "Scoreboard" },
  { id: "weapons",    label: "Weapons" },
  { id: "rounds",     label: "Rounds" },
  { id: "killfeed",   label: "Kill Feed" },
];

function MatchDetailPanel({ playerGuid, matchGuid, token }: { playerGuid: string; matchGuid: string; token: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [detail,  setDetail]  = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<DetailTab>("scoreboard");

  const load = useCallback(async () => {
    if (!playerGuid || !matchGuid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${WORKER_API}/admin/player/${encodeURIComponent(playerGuid)}/match-stats/${encodeURIComponent(matchGuid)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setDetail(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [playerGuid, matchGuid, token]);

  useEffect(() => { load(); }, [load]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderRows(rows: any[]) {
    if (!rows.length) return <div className="px-4 py-6 text-center text-xs text-[var(--text-dim)]">No data.</div>;
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[var(--panel-2)]/60 text-[var(--text-dim)]">
            <tr>{keys.map((k) => <th key={k} className="px-3 py-2 text-left whitespace-nowrap">{k}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)]/30 hover:bg-[var(--panel-2)]/40">
                {keys.map((k) => {
                  const v = row[k];
                  const str = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                  return (
                    <td key={k} className="px-3 py-2 font-mono text-white/70 whitespace-nowrap max-w-[200px] truncate" title={str}>
                      {str}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSection(d: any, tabId: DetailTab): any[] {
    if (!d) return [];
    const maps: Record<DetailTab, string[]> = {
      scoreboard: ["scoreboard","players","player_scores","teams","team_scores"],
      weapons:    ["weapons","weapon_stats","weapon_breakdown","weapon_kills"],
      rounds:     ["rounds","round_stats","round_results","per_round"],
      killfeed:   ["kill_feed","kills","kill_log","killfeed","feed"],
    };
    for (const key of maps[tabId]) {
      if (Array.isArray(d[key])) return d[key];
    }
    // fallback: show raw object as one row
    return typeof d === "object" ? [d] : [];
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--panel-2)]/30">
      {/* Detail tab bar */}
      <div className="flex border-b border-[var(--border)]/60 px-4 pt-2 gap-0">
        {DETAIL_TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-[var(--text-dim)] hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
        <div className="ml-auto pb-1">
          <button onClick={load} className="text-xs text-[var(--text-dim)] hover:text-white transition-colors">↻</button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[80px]">
        {loading && <div className="p-6 text-center text-xs text-[var(--text-dim)]">Loading…</div>}
        {!loading && error && (
          <div className="p-4 text-xs text-[var(--danger)] flex items-center gap-2">
            <span>{error}</span>
            <button onClick={load} className="underline text-[var(--text-dim)] hover:text-white">Retry</button>
          </div>
        )}
        {!loading && !error && detail && renderRows(getSection(detail, tab))}
      </div>
    </div>
  );
}

function MatchStatsTab({ guid, token }: { guid: string; token: string }) {
  const [items,       setItems]       = useState<MatchItem[]>([]);
  const [page,        setPage]        = useState(0);
  const [total,       setTotal]       = useState(0);
  const [totalPgs,    setTotalPgs]    = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const PAGE_SIZE = 20;

  const load = useCallback(async () => {
    if (!guid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const qs  = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      const res = await fetch(`${WORKER_API}/admin/player/${encodeURIComponent(guid)}/match-stats?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = body as any;
      setItems(d?.items ?? []);
      setTotal(d?.totalCount ?? d?.total_count ?? 0);
      setTotalPgs(d?.total_pages ?? 1);
      setExpandedIdx(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [guid, token, page]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">Loading…</div>;
  if (error)   return (
    <div className="bg-[var(--panel)] border rounded-lg p-4 text-[var(--danger)] text-sm flex items-center justify-between">
      <span>{error}</span>
      <button onClick={load} className="text-xs text-[var(--text-dim)] hover:text-white underline ml-4">Retry</button>
    </div>
  );
  if (!items.length) return <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)] text-sm">No match stats found.</div>;

  return (
    <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--panel-2)]">
        <span className="text-xs text-[var(--text-dim)]">{total.toLocaleString()} match{total !== 1 ? "es" : ""}</span>
        <button onClick={load} className="text-xs text-[var(--text-dim)] hover:text-white transition-colors">↻ Refresh</button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--panel-2)]/60 text-xs text-[var(--text-dim)]">
            <tr>
              <th className="px-3 py-2.5 w-8"></th>
              <th className="px-4 py-2.5 text-left whitespace-nowrap">Date</th>
              <th className="px-4 py-2.5 text-left">Mode</th>
              <th className="px-4 py-2.5 text-left">Result</th>
              <th className="px-4 py-2.5 text-right">K</th>
              <th className="px-4 py-2.5 text-right">D</th>
              <th className="px-4 py-2.5 text-right">HS</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Damage</th>
              <th className="px-4 py-2.5 text-right">SP</th>
              <th className="px-4 py-2.5 text-right">EXP</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Mins</th>
              <th className="px-4 py-2.5 text-right whitespace-nowrap">Suspicion</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const won       = item.won;
              const isDraw    = item.is_a_draw;
              const suspicion = item.suspicion_score ?? 0;
              const isOpen    = expandedIdx === idx;

              let resultLabel = "Loss";
              let resultCls   = "bg-red-500/20 text-red-400";
              if (isDraw)   { resultLabel = "Draw"; resultCls = "bg-zinc-600/40 text-zinc-300"; }
              else if (won) { resultLabel = "Win";  resultCls = "bg-emerald-500/20 text-emerald-400"; }

              return (
                <>
                  <tr key={`row-${idx}`}
                    className={`border-t border-[var(--border)]/40 transition-colors ${isOpen ? "bg-[var(--panel-2)]" : "hover:bg-[var(--panel-2)]/50"}`}>
                    {/* Eye button */}
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => setExpandedIdx(isOpen ? null : idx)}
                        title="View match details"
                        className={`p-1 rounded transition-colors ${isOpen ? "text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-white"}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 3C5 3 1.73 7.11 1.05 9.63a1 1 0 000 .74C1.73 12.89 5 17 10 17s8.27-4.11 8.95-6.63a1 1 0 000-.74C18.27 7.11 15 3 10 3zm0 11a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z"/>
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                      {fmtDate(item.end_game_time ?? item.date_added)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-white">{item.mode_str ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${resultCls}`}>{resultLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-right text-white font-medium">{item.total_kills ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-[var(--text-dim)]">{item.total_deaths ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-[var(--text-dim)]">{item.headshots ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-[var(--text-dim)]">{item.total_damage_dealt?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-amber-400">{item.sp ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-blue-400">{item.experience?.toLocaleString() ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-[var(--text-dim)]">{item.minutes_played ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-right">
                      <span className={suspicion > 0 ? "text-red-400 font-semibold" : "text-[var(--text-dim)]"}>{suspicion}</span>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`detail-${idx}`}>
                      <td colSpan={12} className="p-0">
                        <MatchDetailPanel playerGuid={guid} matchGuid={item.guid} token={token} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPgs > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--text-dim)]">
          <span>Page {page + 1} of {totalPgs}</span>
          <div className="flex gap-2">
            <button disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">‹ Prev</button>
            <button disabled={page >= totalPgs - 1 || loading} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">Next ›</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Generic data tab ────────────────────────────────────────────────────── */
function fmtDate(s: string | number | null | undefined) {
  if (!s || s === 0) return "—";
  const d = new Date(typeof s === "number" ? s * 1000 : s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickField(item: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    if (item[k] !== undefined && item[k] !== null) return item[k];
  }
  return null;
}

function DataTab({ guid, path, token }: { guid: string; path: string; token: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!guid || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${WORKER_API}/admin/player/${encodeURIComponent(guid)}/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [guid, path, token]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">Loading…</div>
  );
  if (error) return (
    <div className="bg-[var(--panel)] border rounded-lg p-4 text-[var(--danger)] text-sm flex items-center justify-between">
      <span>{error}</span>
      <button onClick={load} className="text-xs text-[var(--text-dim)] hover:text-white underline ml-4">Retry</button>
    </div>
  );
  if (data === null) return null;

  // Normalise to array
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)   ? data.items
    : Array.isArray(data?.data)    ? data.data
    : Array.isArray(data?.content) ? data.content
    : typeof data === "object" && data !== null ? [data]
    : [];

  if (items.length === 0) return (
    <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)] text-sm">No data found.</div>
  );

  return (
    <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--panel-2)]">
        <span className="text-xs text-[var(--text-dim)]">{items.length} record{items.length !== 1 ? "s" : ""}</span>
        <button onClick={load} className="text-xs text-[var(--text-dim)] hover:text-white transition-colors">↻ Refresh</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--panel-2)]/60 text-xs text-[var(--text-dim)]">
            <tr>
              <th className="px-4 py-2.5 text-left">Name</th>
              <th className="px-4 py-2.5 text-left">Equipped</th>
              <th className="px-4 py-2.5 text-left">Expires</th>
              <th className="px-4 py-2.5 text-left">Duration</th>
              <th className="px-4 py-2.5 text-left whitespace-nowrap">Date Added</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const name = pickField(item,
                "weapon_name","item_name","character_name","icon_name",
                "emblem_name","background_name","name","title","type"
              );
              const isInStorage = pickField(item, "is_in_storage");
              const equipped    = isInStorage !== null ? !isInStorage : pickField(item, "equipped","is_equipped");
              const expires     = pickField(item, "expires","has_expiry","will_expire");
              const duration    = pickField(item, "defined_duration","duration","duration_pieces","expires_at");
              const dateAdded   = pickField(item, "date_added","created_at","createdAt","dateAdded");

              return (
                <tr key={idx} className="border-t border-[var(--border)]/40 hover:bg-[var(--panel-2)]/50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-2.5 font-medium text-white">
                    {name ?? "—"}
                  </td>

                  {/* Equipped */}
                  <td className="px-4 py-2.5">
                    {equipped === null ? (
                      <span className="text-xs text-[var(--text-dim)]">—</span>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        equipped ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-700/40 text-zinc-400"
                      }`}>
                        {equipped ? "Yes" : "No"}
                      </span>
                    )}
                  </td>

                  {/* Expires */}
                  <td className="px-4 py-2.5">
                    {expires === null ? (
                      <span className="text-xs text-[var(--text-dim)]">—</span>
                    ) : (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        expires ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700/40 text-zinc-400"
                      }`}>
                        {expires ? "Yes" : "No"}
                      </span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">
                    {duration !== null ? (duration === 0 ? "Permanent" : String(duration)) : "—"}
                  </td>

                  {/* Date Added */}
                  <td className="px-4 py-2.5 text-xs text-[var(--text-dim)] whitespace-nowrap">
                    {fmtDate(dateAdded)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────────────── */
export default function PlayerProfileView({
  guid: initialGuid,
  onHwid,
}: {
  guid: string;
  onHwid: (guid: string) => void;
}) {
  const [guidInput, setGuidInput] = useState(initialGuid);
  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [token,     setToken]     = useState<string | null>(null);
  const [subTab,    setSubTab]    = useState<SubTab>("profile");

  useEffect(() => {
    fetch("/api/admin-logs")
      .then((r) => r.json())
      .then((b: { token?: string }) => { if (b.token) setToken(b.token); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialGuid) setGuidInput(initialGuid);
  }, [initialGuid]);

  useEffect(() => {
    if (initialGuid && token) loadProfile(initialGuid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuid, token]);

  async function loadProfile(guid: string) {
    if (!guid.trim() || !token) return;
    setLoading(true);
    setError(null);
    setProfile(null);
    setSubTab("profile");
    try {
      const res  = await fetch(`${WORKER_API}/player/${encodeURIComponent(guid.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setProfile(body as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  async function postAction(endpoint: string, guid: string, reason: string): Promise<string | null> {
    if (!token) return "No session token.";
    try {
      const res = await fetch(`${WORKER_API}/admin/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ user_guid: guid, player_guid: guid, reason: reason || undefined }),
      });
      const text = await res.text();
      if (!res.ok) {
        let b: { error?: string; message?: string } = {};
        try { b = JSON.parse(text); } catch { /**/ }
        return b.error ?? b.message ?? `Error ${res.status}: ${text.slice(0, 100)}`;
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Request failed.";
    }
  }

  const p          = profile;
  const player     = p?.player;
  const prof       = player?.profile;
  const role       = prof?.role;
  const userGuid   = p?.guid ?? "—";
  const playerGuid = player?.guid ?? "—";

  const activeSubTab = SUB_TABS.find((t) => t.id === subTab);

  return (
    <div className="flex flex-col gap-4">
      {/* GUID lookup */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={guidInput}
          onChange={(e) => setGuidInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadProfile(guidInput)}
          placeholder="Enter Player GUID…"
          className="flex-1 px-3 py-2 bg-[var(--panel)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
        />
        <button onClick={() => loadProfile(guidInput)} disabled={loading || !guidInput.trim()}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40">
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && <div className="bg-[var(--panel)] border rounded-lg p-4 text-[var(--danger)] text-sm">{error}</div>}

      {profile && (
        <>
          {/* Player header */}
          <div className="flex items-center gap-3 px-1">
            <div>
              <div className="text-base font-semibold text-white">{player?.codename ?? "—"}</div>
              <div className="text-xs text-[var(--text-dim)] font-mono">{userGuid}</div>
            </div>
            <div className="ml-auto flex gap-2">
              <ActionButton
                label="⚡ Ban"
                description="Kicks the player from a live server and writes an active-session ban."
                colorClass="bg-red-600 hover:bg-red-700"
                onConfirm={(reason) => postAction("banplayer", userGuid, reason)}
              />
              <ActionButton
                label="⏏ DC"
                description="Disconnects the player from a live server. No ban is written."
                colorClass="bg-orange-600 hover:bg-orange-700"
                onConfirm={(reason) => postAction("dcplayer", userGuid, reason)}
              />
              <button
                onClick={() => userGuid !== "—" && onHwid(userGuid)}
                disabled={userGuid === "—"}
                className="px-3 py-1.5 rounded-md border border-blue-500/40 text-blue-400 text-sm hover:bg-blue-500/10 disabled:opacity-40 transition-colors"
              >
                HWID →
              </button>
            </div>
          </div>

          {/* Sub-tab bar */}
          <div className="flex overflow-x-auto gap-0 border-b border-[var(--border)] -mb-1">
            {SUB_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  subTab === t.id
                    ? "border-[var(--accent)] text-white bg-[var(--accent)]/10"
                    : "border-transparent text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Profile tab */}
          {subTab === "profile" && (
            <div className="flex flex-col gap-4">
              {/* Account */}
              <div className="bg-[var(--panel)] border rounded-lg p-4">
                <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Account</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Username"           value={p?.username} />
                  <Field label="Email"              value={p?.email} />
                  <Field label="User GUID"          value={userGuid} mono />
                  <Badge label="Verified"           value={p?.verified} />
                  <Badge label="Allow Gifting"      value={player?.allowed_gift} />
                  <Badge label="Marketplace Access" value={p?.market_place_open} />
                </div>
              </div>
              {/* Player */}
              <div className="bg-[var(--panel)] border rounded-lg p-4">
                <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Player</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Codename"    value={player?.codename} />
                  <Field label="Player GUID" value={player?.guid} mono />
                  <Field label="Role"        value={role?.name} />
                  <Field label="EXP"         value={player?.exp} />
                  <Field label="SP"          value={player?.sp} />
                  <Field label="Cash"        value={player?.cash} />
                </div>
              </div>
              {/* Stats */}
              <div className="bg-[var(--panel)] border rounded-lg p-4">
                <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Stats</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Field label="Kills"         value={prof?.kills} />
                  <Field label="Deaths"        value={prof?.deaths} />
                  <Field label="Wins"          value={prof?.wins} />
                  <Field label="Losses"        value={prof?.loses} />
                  <Field label="Headshot Rate" value={prof?.headshot_rate != null ? `${prof.headshot_rate}%` : null} />
                </div>
              </div>
            </div>
          )}

          {/* Match stats tab */}
          {subTab === "match-stats" && token && (
            <MatchStatsTab key={playerGuid} guid={playerGuid} token={token} />
          )}

          {/* Generic data tabs — lazy loaded */}
          {subTab !== "profile" && subTab !== "match-stats" && activeSubTab?.path && token && (
            <DataTab key={`${playerGuid}-${activeSubTab.path}`} guid={playerGuid} path={activeSubTab.path} token={token} />
          )}
        </>
      )}
    </div>
  );
}
