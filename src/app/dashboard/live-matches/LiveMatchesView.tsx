"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Match = {
  guid: string;
  host_guid: string;
  map_guid: string;
  game_mode: string;
  player_count: number;
  max_players: number;
  score_limit: number;
  time_limit: number;
  status: string;
  map_name: string;
  map_image: string;
};

type MatchesResponse = {
  matches: Match[];
  total: number;
};

type MatchPlayer = {
  codename: string;
  player_guid: string;
  rank_num: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  experience: number;
  team: string;
  won: boolean;
};

type MatchDetail = {
  all_players: MatchPlayer[];
  red_team: MatchPlayer[];
  blue_team: MatchPlayer[];
  is_ffa: boolean;
  map: string;
  mode: string;
  match_time: number;
  winner_team: string | null;
};

const REFRESH_INTERVAL = 30_000;

function Badge({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        color ?? "bg-[var(--panel-2)] text-[var(--text-dim)]"
      }`}
    >
      {children}
    </span>
  );
}

function PlayerRow({ p }: { p: MatchPlayer }) {
  const teamColor =
    p.team === "red"
      ? "text-red-400"
      : p.team === "blue"
      ? "text-blue-400"
      : "text-[var(--text-dim)]";

  return (
    <tr className="border-b border-[var(--panel)] last:border-0">
      <td className="py-1.5 px-3 font-medium text-sm">{p.codename}</td>
      <td className={`py-1.5 px-3 text-xs ${teamColor}`}>{p.team || "—"}</td>
      <td className="py-1.5 px-3 text-xs text-center">{p.rank_num}</td>
      <td className="py-1.5 px-3 text-xs text-center">{p.kills}</td>
      <td className="py-1.5 px-3 text-xs text-center">{p.deaths}</td>
      <td className="py-1.5 px-3 text-xs text-center">{p.assists}</td>
      <td className="py-1.5 px-3 text-xs text-center">{p.headshots}</td>
    </tr>
  );
}

function MatchCard({ match }: { match: Match }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function toggleExpand() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (detail) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await fetch(`/api/live-matches/${match.guid}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setDetail(body as MatchDetail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load details.");
    } finally {
      setDetailLoading(false);
    }
  }

  const statusColor =
    match.status === "in_progress"
      ? "bg-green-900/60 text-green-300"
      : match.status === "waiting"
      ? "bg-yellow-900/60 text-yellow-300"
      : "bg-[var(--panel-2)] text-[var(--text-dim)]";

  const players = detail
    ? detail.is_ffa
      ? detail.all_players
      : [...(detail.red_team ?? []), ...(detail.blue_team ?? [])]
    : [];

  return (
    <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
      {/* Map image banner */}
      {match.map_image && (
        <div className="h-24 bg-black/40 overflow-hidden relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={match.map_image}
            alt={match.map_name}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel)] to-transparent" />
          <div className="absolute bottom-2 left-3 text-sm font-semibold">{match.map_name}</div>
        </div>
      )}
      {!match.map_image && (
        <div className="h-10 flex items-center px-3">
          <span className="font-semibold text-sm">{match.map_name}</span>
        </div>
      )}

      {/* Match info */}
      <div className="px-3 pb-3">
        <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
          <Badge color={statusColor}>{match.status.replace(/_/g, " ")}</Badge>
          <Badge>{match.game_mode}</Badge>
          <Badge>
            {match.player_count}/{match.max_players} players
          </Badge>
        </div>
        <div className="text-xs text-[var(--text-dim)] font-mono truncate">{match.guid}</div>
        <button
          onClick={toggleExpand}
          className="mt-2 w-full text-xs px-3 py-1.5 rounded-md border text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
        >
          {expanded ? "Hide Players" : "Show Players"}
        </button>
      </div>

      {/* Expandable player list */}
      {expanded && (
        <div className="border-t">
          {detailLoading && (
            <p className="text-xs text-[var(--text-dim)] px-3 py-3">Loading players…</p>
          )}
          {detailError && (
            <p className="text-xs text-[var(--danger)] px-3 py-3">{detailError}</p>
          )}
          {detail && players.length === 0 && (
            <p className="text-xs text-[var(--text-dim)] px-3 py-3">No player data available.</p>
          )}
          {detail && players.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[var(--text-dim)] border-b border-[var(--panel)]">
                    <th className="py-1.5 px-3 text-left">Codename</th>
                    <th className="py-1.5 px-3 text-left">Team</th>
                    <th className="py-1.5 px-3 text-center">Rank</th>
                    <th className="py-1.5 px-3 text-center">K</th>
                    <th className="py-1.5 px-3 text-center">D</th>
                    <th className="py-1.5 px-3 text-center">A</th>
                    <th className="py-1.5 px-3 text-center">HS</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p) => (
                    <PlayerRow key={p.player_guid} p={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LiveMatchesView() {
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/live-matches");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setData(body as MatchesResponse);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }
    timerRef.current = setTimeout(() => load(), REFRESH_INTERVAL);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoRefresh, load, lastUpdated]);

  const matches = data?.matches ?? [];

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 bg-[var(--panel)] border rounded-lg px-4 py-3">
        <div className="flex-1 text-sm text-[var(--text-dim)]">
          {lastUpdated ? (
            <>Last updated: {lastUpdated.toLocaleTimeString()}</>
          ) : (
            "—"
          )}
          {data && (
            <span className="ml-3 font-medium text-white">{data.total} active</span>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <label className="flex items-center gap-2 text-sm text-[var(--text-dim)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Auto-refresh (30s)
        </label>
      </div>

      {loading && !data && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          Loading…
        </div>
      )}
      {!loading && error && (
        <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">{error}</div>
      )}
      {!loading && !error && data && matches.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          No active matches right now.
        </div>
      )}
      {matches.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((m) => (
            <MatchCard key={m.guid} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
