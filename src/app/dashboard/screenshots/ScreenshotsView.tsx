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

const PAGE_SIZE = 24;

function fmtDate(s: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default function ScreenshotsView() {
  const [page, setPage] = useState(0);
  const [guidInput, setGuidInput] = useState("");
  const [guid, setGuid] = useState("");
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Item | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      page: String(page),
      size: String(PAGE_SIZE),
    });
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

  useEffect(() => {
    load();
  }, [load]);

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
        <button
          type="submit"
          className="px-4 py-1.5 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)]"
        >
          Filter
        </button>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-1.5 rounded-md border text-sm text-[var(--text-dim)] hover:text-white"
        >
          Reset
        </button>
      </form>

      {loading && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          Loading…
        </div>
      )}
      {!loading && error && (
        <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">
          {error}
        </div>
      )}
      {!loading && !error && data && data.items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">
          No screenshots found.
        </div>
      )}
      {!loading && !error && data && data.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.items.map((it) => (
            <button
              key={it.unique_id}
              onClick={() => setLightbox(it)}
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
              <div className="p-2.5 text-xs">
                <div className="font-mono truncate text-[var(--text-dim)]">
                  {it.player_guid}
                </div>
                <div className="text-[var(--text-dim)] mt-0.5">
                  {fmtDate(it.time)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-dim)]">
          <div>
            Page {data.page + 1} of {Math.max(1, totalPages)} · {data.total_count} total
          </div>
          <div className="flex gap-2">
            <button
              disabled={data.first || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={data.last || loading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-md border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full bg-[var(--panel)] border rounded-lg overflow-hidden"
          >
            <div className="flex items-start justify-between px-4 py-3 border-b text-sm">
              <div>
                <div className="font-mono text-[var(--text-dim)]">
                  {lightbox.player_guid}
                </div>
                <div className="text-[var(--text-dim)] text-xs mt-0.5">
                  {fmtDate(lightbox.time)}
                </div>
              </div>
              <button
                onClick={() => setLightbox(null)}
                className="px-3 py-1 text-[var(--text-dim)] hover:text-white"
              >
                Close
              </button>
            </div>
            <div className="bg-black flex items-center justify-center max-h-[80vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/screenshots/${lightbox.unique_id}`}
                alt={`screenshot ${lightbox.unique_id}`}
                className="max-w-full max-h-[80vh]"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
