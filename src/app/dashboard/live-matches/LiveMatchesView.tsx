"use client";

import { useRef, useState } from "react";

/* ── Types ─────────────────────────────────────────────── */
type MatchItem = {
  assists: number;
  blue_wins: number;
  date_added: string;
  deaths: number;
  experience: number;
  headshots: number;
  kills: number;
  map: number;
  match_result_guid: string;
  match_time: string;
  missions_completed: number;
  mode: number;
  red_wins: number;
  round_loses: number;
  round_wins: number;
  sp: number;
  team: string;
  winner_team: string;
  won: boolean;
};

type MatchesResponse = {
  first: boolean;
  last: boolean;
  page: number;
  totalCount: number;
  total_pages: number;
  items: MatchItem[];
};

/* ── Helpers ────────────────────────────────────────────── */
function formatDate(iso: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(raw: string | number) {
  const secs = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  if (isNaN(secs) || secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

const MODE_LABELS: Record<number, string> = {
  0: "Deathmatch",
  1: "Team DM",
  2: "Domination",
  3: "Search & Destroy",
  4: "Escort",
  5: "Free For All",
};

const MAP_LABELS: Record<number, string> = {
  // add known map IDs here as they become available
};

function modeLabel(mode: number) {
  return MODE_LABELS[mode] ?? `Mode ${mode}`;
}
function mapLabel(map: number) {
  return MAP_LABELS[map] ?? `Map ${map}`;
}

/* ── Pagination control ─────────────────────────────────── */
function Pagination({
  page,
  totalPages,
  isFirst,
  isLast,
  onGo,
}: {
  page: number;
  totalPages: number;
  isFirst: boolean;
  isLast: boolean;
  onGo: (p: number) => void;
}) {
  const safePage = isNaN(page) || page < 0 ? 0 : page;
  const safeTotal = isNaN(totalPages) || totalPages < 1 ? 1 : totalPages;
  const atFirst = !!isFirst || safePage === 0;
  const atLast = !!isLast || safePage >= safeTotal - 1;

  if (safeTotal <= 1) return null;

  // Compute window of page numbers to show
  const range: number[] = [];
  const delta = 2;
  for (let i = Math.max(0, safePage - delta); i <= Math.min(safeTotal - 1, safePage + delta); i++) {
    range.push(i);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4 flex-wrap">
      <button
        disabled={atFirst}
        onClick={() => onGo(0)}
        className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white disabled:opacity-30"
      >
        «
      </button>
      <button
        disabled={atFirst}
        onClick={() => onGo(safePage - 1)}
        className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white disabled:opacity-30"
      >
        ‹
      </button>
      {range[0] > 0 && (
        <>
          <button onClick={() => onGo(0)} className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white">
            1
          </button>
          {range[0] > 1 && <span className="text-[var(--text-dim)] text-xs px-1">…</span>}
        </>
      )}
      {range.map((p) => (
        <button
          key={p}
          onClick={() => onGo(p)}
          className={`px-2.5 py-1 rounded text-xs border transition-colors ${
            p === safePage
              ? "bg-[var(--accent)] border-[var(--accent)] text-white"
              : "text-[var(--text-dim)] hover:text-white"
          }`}
        >
          {p + 1}
        </button>
      ))}
      {range[range.length - 1] < safeTotal - 1 && (
        <>
          {range[range.length - 1] < safeTotal - 2 && (
            <span className="text-[var(--text-dim)] text-xs px-1">…</span>
          )}
          <button onClick={() => onGo(safeTotal - 1)} className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white">
            {safeTotal}
          </button>
        </>
      )}
      <button
        disabled={atLast}
        onClick={() => onGo(safePage + 1)}
        className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white disabled:opacity-30"
      >
        ›
      </button>
      <button
        disabled={atLast}
        onClick={() => onGo(safeTotal - 1)}
        className="px-2 py-1 rounded text-xs border text-[var(--text-dim)] hover:text-white disabled:opacity-30"
      >
        »
      </button>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
export default function LiveMatchesView() {
  const [inputGuid, setInputGuid] = useState("");
  const [searchedGuid, setSearchedGuid] = useState<string | null>(null);
  const [data, setData] = useState<MatchesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function fetchPage(guid: string, page: number) {
    const safePage = isNaN(page) || page < 0 ? 0 : Math.floor(page);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/search-matches?guid=${encodeURIComponent(guid)}&page=${safePage}`,
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setData(body as MatchesResponse);
      setSearchedGuid(guid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const g = inputGuid.trim();
    if (!g) return;
    fetchPage(g, 0);
  }

  function handlePageChange(page: number) {
    if (searchedGuid) fetchPage(searchedGuid, page);
  }

  const items = data?.items ?? [];

  return (
    <div>
      {/* Search bar */}
      <form
        onSubmit={handleSearch}
        className="flex gap-2 mb-6"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputGuid}
          onChange={(e) => setInputGuid(e.target.value)}
          placeholder="Enter player GUID (e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
          className="flex-1 bg-[var(--panel)] border rounded-lg px-4 py-2.5 text-sm font-mono placeholder:text-[var(--text-dim)] focus:outline-none focus:border-[var(--accent)]"
          spellCheck={false}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading || !inputGuid.trim()}
          className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-[var(--panel)] border border-red-800 rounded-lg p-4 text-[var(--danger)] text-sm mb-4">
          {error}
        </div>
      )}

      {/* No results */}
      {!loading && !error && data && items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          No match history found for this player.
        </div>
      )}

      {/* Results */}
      {data && items.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-sm text-[var(--text-dim)]">
              <span className="font-mono text-white">{searchedGuid}</span>
              {" — "}
              <span className="text-white font-medium">{data.totalCount}</span> match
              {data.totalCount !== 1 ? "es" : ""} total
            </p>
            <p className="text-xs text-[var(--text-dim)]">
              Page {data.page + 1} of {data.total_pages}
            </p>
          </div>

          {/* Top pagination */}
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            isFirst={data.first}
            isLast={data.last}
            onGo={handlePageChange}
          />

          {/* Table */}
          <div className="mt-4 overflow-x-auto bg-[var(--panel)] border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-dim)] border-b border-[var(--panel-2)]">
                  <th className="py-2.5 px-3 text-left whitespace-nowrap">Date</th>
                  <th className="py-2.5 px-3 text-left whitespace-nowrap">Map</th>
                  <th className="py-2.5 px-3 text-left whitespace-nowrap">Mode</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Team</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Result</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">K</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">D</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">A</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">HS</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">XP</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Duration</th>
                  <th className="py-2.5 px-3 text-center whitespace-nowrap">Rounds W/L</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const teamColor =
                    item.team?.toLowerCase() === "red"
                      ? "text-red-400"
                      : item.team?.toLowerCase() === "blue"
                      ? "text-blue-400"
                      : "text-[var(--text-dim)]";

                  return (
                    <tr
                      key={item.match_result_guid}
                      className="border-b border-[var(--panel-2)] last:border-0 hover:bg-[var(--panel-2)] transition-colors"
                    >
                      <td className="py-2 px-3 text-xs whitespace-nowrap">
                        {formatDate(item.date_added)}
                      </td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">
                        {mapLabel(item.map)}
                      </td>
                      <td className="py-2 px-3 text-xs whitespace-nowrap">
                        {modeLabel(item.mode)}
                      </td>
                      <td className={`py-2 px-3 text-xs text-center font-medium ${teamColor}`}>
                        {item.team || "—"}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.won ? (
                          <span className="px-1.5 py-0.5 rounded bg-green-900/60 text-green-300 text-xs font-medium">
                            WIN
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 text-xs font-medium">
                            LOSS
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs text-center font-medium text-white">
                        {item.kills}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.deaths}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.assists}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.headshots}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.experience}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {formatDuration(item.match_time)}
                      </td>
                      <td className="py-2 px-3 text-xs text-center">
                        {item.round_wins}/{item.round_loses}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bottom pagination */}
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            isFirst={data.first}
            isLast={data.last}
            onGo={handlePageChange}
          />
        </>
      )}

      {/* Initial empty state */}
      {!loading && !error && !data && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          Enter a player GUID above to look up their match history.
        </div>
      )}
    </div>
  );
}
