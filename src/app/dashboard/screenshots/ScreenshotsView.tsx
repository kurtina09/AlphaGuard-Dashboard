"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  unique_id: string;
  player_guid: string;
  time: string;
};

type PageResponse = {
  items: Item[];
  page: number;
  size: number;
  total_count: number;
  total_pages: number;
  first: boolean;
  last: boolean;
};

type PlayerInfo = {
  player_guid: string;
  codename: string | null;
  rank_num: number | null;
  rank_exp: number | null;
  kills: number | null;
  kill_death_ratio: number | null;
  matches_played: number | null;
  win_ratio: number | null;
};

const PAGE_SIZE = 200;

function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

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
  const total = data.total_pages;
  if (total <= 1) return null;

  const delta = 2;
  const pages: (number | "…")[] = [];
  const rangeStart = Math.max(0, current - delta);
  const rangeEnd = Math.min(total - 1, current + delta);
  if (rangeStart > 0) {
    pages.push(0);
    if (rangeStart > 1) pages.push("…");
  }
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) {
    if (rangeEnd < total - 2) pages.push("…");
    pages.push(total - 1);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-[var(--text-dim)] text-center">
        Page {current + 1} of {total} · {data.total_count} total
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        <button
          disabled={data.first || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >‹</button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-[var(--text-dim)]">…</span>
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

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[var(--panel-2)] rounded-md px-3 py-2">
      <div className="text-xs text-[var(--text-dim)] mb-0.5">{label}</div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

export default function ScreenshotsView() {
  const [page, setPage] = useState(0);
  const [guidInput, setGuidInput] = useState("");
  const [guid, setGuid] = useState("");
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lightbox, setLightbox] = useState<Item | null>(null);
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (guid) qs.set("player_guid", guid);
    try {
      const res = await fetch(`/api/screenshots?${qs.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setData(body as PageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, guid]);

  useEffect(() => { load(); }, [load]);

  function openLightbox(item: Item) {
    setLightbox(item);
    setPlayerInfo(null);
    setPlayerError(null);
    setZoom(1);
  }

  function closeLightbox() {
    setLightbox(null);
    setPlayerInfo(null);
    setPlayerError(null);
    setZoom(1);
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(1, z - e.deltaY * 0.001)));
  }

  async function loadPlayerInfo(playerGuid: string) {
    setPlayerLoading(true);
    setPlayerError(null);
    try {
      const res = await fetch(`/api/player/${playerGuid}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setPlayerInfo(body as PlayerInfo);
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : "Failed to load player info.");
    } finally {
      setPlayerLoading(false);
    }
  }

  function applyFilter(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setGuid(guidInput.trim());
  }

  function reset() {
    setGuidInput("");
    setGuid("");
    setPage(0);
  }

  const totalPages = data?.total_pages ?? 0;

  return (
    <>
      <form
        onSubmit={applyFilter}
        className="flex flex-wrap gap-3 items-end mb-4 bg-[var(--panel)] border rounded-lg p-4"
      >
        <div className="flex flex-col gap-1 flex-1 min-w-[280px]">
          <label className="text-xs text-[var(--text-dim)]">Player GUID</label>
          <input
            type="text"
            value={guidInput}
            onChange={(e) => setGuidInput(e.target.value)}
            placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button type="submit" className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)]">
          Filter
        </button>
        <button type="button" onClick={reset} className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white">
          Reset
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
        <button
          type="button"
          disabled={!data || data.last || loading}
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </form>

      {data && <Pagination data={data} loading={loading} setPage={setPage} />}

      {loading && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">Loading…</div>
      )}
      {!loading && error && (
        <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">{error}</div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No screenshots found.</div>
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.items.map((it) => (
            <button
              key={it.unique_id}
              onClick={() => openLightbox(it)}
              className="group text-left bg-[var(--panel)] border rounded-lg overflow-hidden hover:border-[var(--accent)] transition-colors"
            >
              <div className="aspect-video bg-black/40 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/screenshots/${it.unique_id}`}
                  alt={`screenshot ${it.unique_id}`}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:opacity-90"
                />
              </div>
              <div className="p-2.5">
                <div className="font-mono truncate text-sm font-semibold">{it.player_guid}</div>
                <div className="text-[var(--text-dim)] text-xs mt-0.5">{fmtDate(it.time)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && <Pagination data={data} loading={loading} setPage={setPage} />}

      {lightbox && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full bg-[var(--panel)] border rounded-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-4 py-3 border-b text-sm shrink-0">
              <div>
                <div className="font-mono text-xs text-[var(--text-dim)]">{lightbox.player_guid}</div>
                <div className="text-[var(--text-dim)] text-xs mt-0.5">{fmtDate(lightbox.time)}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded-md overflow-hidden text-xs">
                  <button
                    onClick={() => setZoom(z => Math.max(1, +(z - 0.25).toFixed(2)))}
                    disabled={zoom <= 1}
                    className="px-2 py-1 text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] disabled:opacity-30"
                  >−</button>
                  <span className="px-2 py-1 text-[var(--text-dim)] min-w-[44px] text-center">{Math.round(zoom * 100)}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))}
                    disabled={zoom >= 4}
                    className="px-2 py-1 text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] disabled:opacity-30"
                  >+</button>
                  <button
                    onClick={() => setZoom(1)}
                    disabled={zoom === 1}
                    className="px-2 py-1 text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] disabled:opacity-30 border-l"
                  >Reset</button>
                </div>
                <button onClick={closeLightbox} className="px-3 py-1 text-[var(--text-dim)] hover:text-white text-sm">
                  Close
                </button>
              </div>
            </div>

            {/* Screenshot */}
            <div
              className="bg-black overflow-auto"
              style={{ maxHeight: '60vh' }}
              onWheel={handleWheel}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/screenshots/${lightbox.unique_id}`}
                alt={`screenshot ${lightbox.unique_id}`}
                onClick={() => setZoom(z => z >= 4 ? 1 : +(z + 0.5).toFixed(2))}
                style={{
                  display: 'block',
                  width: `${zoom * 100}%`,
                  cursor: zoom < 4 ? 'zoom-in' : 'zoom-out',
                  transition: 'width 0.15s ease',
                }}
              />
            </div>

            {/* Player info section */}
            <div className="border-t px-4 py-3 shrink-0">
              {!playerInfo && !playerLoading && !playerError && (
                <button
                  onClick={() => loadPlayerInfo(lightbox.player_guid)}
                  className="px-4 py-1.5 rounded-md bg-[var(--panel-2)] border text-sm text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
                >
                  Load Player Info
                </button>
              )}

              {playerLoading && (
                <p className="text-sm text-[var(--text-dim)]">Loading player info…</p>
              )}

              {playerError && (
                <p className="text-sm text-[var(--danger)]">{playerError}</p>
              )}

              {playerInfo && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <StatCell label="Codename" value={playerInfo.codename ?? "—"} />
                  <StatCell label="Rank" value={playerInfo.rank_num != null ? String(playerInfo.rank_num) : "—"} />
                  <StatCell label="Kills" value={playerInfo.kills != null ? String(playerInfo.kills) : "—"} />
                  <StatCell label="KDR" value={playerInfo.kill_death_ratio != null ? playerInfo.kill_death_ratio.toFixed(2) : "—"} />
                  <StatCell label="Matches" value={playerInfo.matches_played != null ? String(playerInfo.matches_played) : "—"} />
                  <StatCell label="Win Ratio" value={playerInfo.win_ratio != null ? playerInfo.win_ratio.toFixed(2) : "—"} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
