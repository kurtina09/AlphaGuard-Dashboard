"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlayerItem = Record<string, any>;

type PageResponse = {
  items?: PlayerItem[];
  content?: PlayerItem[];
  data?: PlayerItem[];
  totalCount?: number;
  total_count?: number;
  totalElements?: number;
  page?: number;
  total_pages?: number;
  totalPages?: number;
  first?: boolean;
  last?: boolean;
};

const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";
const PAGE_SIZE  = 20;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-transparent text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function pick(item: PlayerItem, ...keys: string[]): string {
  for (const k of keys) {
    const v = item[k];
    if (v !== undefined && v !== null && v !== "") return String(v);
  }
  return "—";
}

export default function PlayersSearchView({
  onProfile,
  onHwid,
}: {
  onProfile: (guid: string) => void;
  onHwid:    (guid: string) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(0);
  const [data,        setData]        = useState<PageResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [token,       setToken]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (search) qs.set("search_name_query", search);
    try {
      const res  = await fetch(`${WORKER_API}/admin/players?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setData(body as PageResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => { load(); }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput.trim());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: PlayerItem[] = (data as any)?.items ?? (data as any)?.content ?? (data as any)?.data ?? [];
  const totalCount = data?.totalCount ?? data?.total_count ?? (data as any)?.totalElements ?? 0;
  const totalPages = data?.total_pages ?? (data as any)?.totalPages ?? 1;
  const isFirst    = data?.first ?? page === 0;
  const isLast     = data?.last  ?? page >= totalPages - 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Search bar */}
      <form onSubmit={applySearch} className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by codename, GUID, username…"
          className="flex-1 px-3 py-2 bg-[var(--panel)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
        />
        <button type="submit" disabled={loading}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40">
          Search
        </button>
        {search && (
          <button type="button" onClick={() => { setSearchInput(""); setSearch(""); setPage(0); inputRef.current?.focus(); }}
            className="px-3 py-2 rounded-md border text-sm text-[var(--text-dim)] hover:text-white">
            Clear
          </button>
        )}
      </form>

      {/* Count */}
      {data && !loading && (
        <div className="text-xs text-[var(--text-dim)]">
          {totalCount.toLocaleString()} player{totalCount !== 1 ? "s" : ""}
          {search && <span className="ml-1 text-[var(--accent)]">matching &ldquo;{search}&rdquo;</span>}
        </div>
      )}

      {/* States */}
      {loading && <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">Loading…</div>}
      {!loading && error && <div className="bg-[var(--panel)] border rounded-lg p-6 text-[var(--danger)]">{error}</div>}
      {!loading && !error && data && items.length === 0 && (
        <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)]">No players found.</div>
      )}

      {/* Table */}
      {!loading && !error && items.length > 0 && (
        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--panel-2)] text-xs text-[var(--text-dim)]">
                <tr>
                  <th className="px-4 py-2.5 text-left">Codename</th>
                  <th className="px-4 py-2.5 text-left">Player GUID</th>
                  <th className="px-4 py-2.5 text-left">Username</th>
                  <th className="px-4 py-2.5 text-center w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const codename   = pick(item, "codename","Codename","player_codename","playerCodename","name","nickname");
                  const playerGuid = pick(item, "player_guid","playerGuid");
                  const userGuid   = pick(item, "user_guid","userGuid","guid","id");
                  const username   = pick(item, "username","userName","user_name","email");
                  // Profile/HWID actions use user_guid; display column shows player_guid
                  const actionGuid = userGuid !== "—" ? userGuid : playerGuid;

                  return (
                    <tr key={idx} className="border-t border-[var(--border)]/40 hover:bg-[var(--panel-2)]/50 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-white">{codename}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs text-[var(--text-dim)] truncate max-w-[180px]" title={playerGuid}>{playerGuid}</span>
                          {playerGuid !== "—" && <CopyButton text={playerGuid} />}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[var(--text-dim)]">{username}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => actionGuid !== "—" && onProfile(actionGuid)}
                            disabled={actionGuid === "—"}
                            className="px-2.5 py-1 rounded text-xs border border-[var(--accent)]/40 text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-40 transition-colors"
                          >
                            Profile
                          </button>
                          <button
                            onClick={() => actionGuid !== "—" && onHwid(actionGuid)}
                            disabled={actionGuid === "—"}
                            className="px-2.5 py-1 rounded text-xs border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 transition-colors"
                          >
                            HWID
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] text-xs text-[var(--text-dim)]">
              <span>Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={isFirst || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">‹ Prev</button>
                <button disabled={isLast || loading} onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded border hover:text-white disabled:opacity-40 disabled:cursor-not-allowed">Next ›</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
