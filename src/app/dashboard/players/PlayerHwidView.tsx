"use client";

import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HwidInfo = Record<string, any>;

const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="shrink-0 px-1.5 py-0.5 rounded text-xs border border-transparent text-[var(--text-dim)] hover:text-white hover:border-[var(--accent)] transition-colors"
    >
      {copied ? "✓" : "Copy"}
    </button>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
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

function HwidCard({ hwid, index }: { hwid: HwidInfo; index: number }) {
  const [expanded, setExpanded] = useState(false);

  function pick(...keys: string[]): string {
    for (const k of keys) {
      const v = hwid[k];
      if (v !== undefined && v !== null && v !== "") return String(v);
    }
    return "—";
  }

  const hwidVal = pick("hwid", "hwid_hash", "hwidHash", "hardware_id", "hardwareId", "device_id", "deviceId");
  const status  = pick("status", "ban_status", "banStatus", "is_banned", "banned");
  const bannedAt = pick("banned_at", "bannedAt", "ban_date", "banDate", "created_at", "createdAt");
  const reason  = pick("reason", "ban_reason", "banReason");

  return (
    <div className="bg-[var(--panel-2)] border border-[var(--border)] rounded-lg overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider shrink-0">
            HWID #{index + 1}
          </span>
          {hwidVal !== "—" && (
            <span className="font-mono text-xs text-[var(--text-dim)] truncate">{hwidVal.slice(0, 32)}{hwidVal.length > 32 ? "…" : ""}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status !== "—" && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
              status.toLowerCase().includes("ban") || status === "1" || status === "true"
                ? "bg-red-500/20 text-red-400"
                : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {status.toLowerCase().includes("ban") ? "Banned" : status === "1" || status === "true" ? "Banned" : status}
            </span>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[var(--text-dim)] hover:text-white transition-colors"
          >
            {expanded ? "▲ Less" : "▼ More"}
          </button>
        </div>
      </div>

      {/* Always-visible key fields */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="HWID Hash" value={hwidVal} mono />
        <Field label="Status"   value={status} />
        <Field label="Banned At" value={bannedAt} />
        <Field label="Reason"   value={reason} />
      </div>

      {/* Expanded: all raw fields */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]/60 pt-3">
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide mb-2">All Fields</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.entries(hwid).map(([k, v]) => (
              <div key={k} className="flex flex-col bg-[var(--panel)] rounded px-3 py-1.5">
                <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wide">{k}</span>
                <span className="text-xs font-mono break-all text-white/80">
                  {v === null ? "null" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerHwidView({ guid: initialGuid }: { guid: string }) {
  const [guidInput, setGuidInput] = useState(initialGuid);
  const [hwidData,  setHwidData]  = useState<HwidInfo | HwidInfo[] | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [token,     setToken]     = useState<string | null>(null);

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
    if (initialGuid && token) loadHwid(initialGuid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuid, token]);

  async function loadHwid(guid: string) {
    if (!guid.trim() || !token) return;
    setLoading(true);
    setError(null);
    setHwidData(null);
    try {
      const res  = await fetch(`${WORKER_API}/admin/player/${encodeURIComponent(guid.trim())}/hwid-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const text = await res.text();
      let body: unknown;
      try { body = JSON.parse(text); } catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 200)}`); }
      const b = body as { error?: string; message?: string };
      if (!res.ok) throw new Error(b.error ?? b.message ?? `Error ${res.status}`);
      setHwidData(body as HwidInfo | HwidInfo[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  // Normalise response — could be an array or a single object or wrapped
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: HwidInfo[] = (() => {
    if (!hwidData) return [];
    if (Array.isArray(hwidData)) return hwidData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = hwidData as any;
    if (Array.isArray(d.items))   return d.items;
    if (Array.isArray(d.data))    return d.data;
    if (Array.isArray(d.hwids))   return d.hwids;
    if (Array.isArray(d.content)) return d.content;
    // Single object
    return [hwidData];
  })();

  return (
    <div className="flex flex-col gap-6">
      {/* GUID lookup */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={guidInput}
          onChange={(e) => setGuidInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadHwid(guidInput)}
          placeholder="Enter Player GUID…"
          className="flex-1 px-3 py-2 bg-[var(--panel)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => loadHwid(guidInput)}
          disabled={loading || !guidInput.trim()}
          className="px-4 py-2 rounded-md bg-[var(--accent)] text-white text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40"
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {error && (
        <div className="bg-[var(--panel)] border rounded-lg p-4 text-[var(--danger)] text-sm">{error}</div>
      )}

      {hwidData && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider">
              HWID Records
            </div>
            <div className="text-xs text-[var(--text-dim)]">
              {items.length} record{items.length !== 1 ? "s" : ""}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="bg-[var(--panel)] border rounded-lg p-10 text-center text-[var(--text-dim)] text-sm">
              No HWID records found for this player.
            </div>
          ) : (
            items.map((hwid, idx) => (
              <HwidCard key={idx} hwid={hwid} index={idx} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
