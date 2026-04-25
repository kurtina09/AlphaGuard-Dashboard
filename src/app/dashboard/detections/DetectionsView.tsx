"use client";

import { useCallback, useEffect, useState } from "react";

type Detection = {
  guid: string;
  player_guid: string;
  user_guid: string;
  codename: string;
  username: string;
  game_id: string;
  reason: string;
  kick: boolean;
  ban: boolean;
  is_banned: boolean;
  banned_date: string;
  banned_reason: string;
  date_added: string;
};

type PageResponse = {
  items: Detection[];
  page: number;
  total_pages: number;
  total_count: number;
  first: boolean;
  last: boolean;
};

const PAGE_SIZE = 20;

function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function DetectionsView() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
    if (search) qs.set("search_name_query", search);
    if (from) qs.set("from", new Date(from).toISOString());
    if (to) qs.set("to", new Date(to).toISOString());
    try {
      const res = await fetch(`/api/detections?${qs.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      setData(body as PageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [page, search, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(0);
  }

  const totalPages = data?.total_pages ?? 0;

  return (
    <>
      <form
        onSubmit={applySearch}
        className="flex flex-wrap gap-3 items-end mb-4 bg-[var(--panel)] border rounded-lg p-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-dim)]">Search codename</label>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="e.g. Sniper99"
            className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-dim)]">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setPage(0);
              setFrom(e.target.value);
            }}
            className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--text-dim)]">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setPage(0);
              setTo(e.target.value);
            }}
            className="px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)]"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white"
        >
          Reset
        </button>
      </form>

      <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--panel-2)] text-left text-[var(--text-dim)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Codename</th>
                <th className="px-4 py-2.5 font-medium">Player GUID</th>
                <th className="px-4 py-2.5 font-medium">Reason</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-dim)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--danger)]">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && data && data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-dim)]">
                    No detections found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                data?.items.map((d) => (
                  <tr key={d.guid} className="border-t hover:bg-[var(--panel-2)]/50">
                    <td className="px-4 py-2.5 whitespace-nowrap text-[var(--text-dim)]">
                      {fmtDate(d.date_added)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{d.codename || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs text-[var(--text-dim)]">{d.player_guid || "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 max-w-md">
                      <div className="truncate" title={d.reason}>
                        {d.reason}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {d.ban ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-[var(--danger)]/20 text-[var(--danger)]">
                          BAN
                        </span>
                      ) : d.kick ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-[var(--warn)]/20 text-[var(--warn)]">
                          KICK
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-dim)]">LOG</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {d.is_banned ? (
                        <span className="text-xs text-[var(--danger)]">Banned</span>
                      ) : (
                        <span className="text-xs text-[var(--text-dim)]">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-dim)]">
        <div>
          {data
            ? `Page ${data.page + 1} of ${Math.max(1, totalPages)} · ${data.total_count} total`
            : ""}
        </div>
        <div className="flex gap-2">
          <button
            disabled={!data || data.first || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            disabled={!data || data.last || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}
