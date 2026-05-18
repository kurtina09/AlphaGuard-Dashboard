"use client";

import { useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Profile = Record<string, any>;

const WORKER_API = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";

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
        active
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-zinc-700/40 text-zinc-400"
      }`}>
        {active ? "Yes" : "No"}
      </span>
    </div>
  );
}

type ActionState = "idle" | "confirm" | "loading" | "done" | "error";

function ActionButton({
  label, description, colorClass, onConfirm,
}: {
  label: string;
  description: string;
  colorClass: string;
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
      <input
        type="text" value={reason} onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)…"
        className="px-3 py-1.5 bg-[var(--panel)] border rounded text-sm outline-none focus:border-[var(--accent)]"
      />
      <div className="flex gap-2">
        <button onClick={execute} disabled={state === "loading"}
          className={`px-4 py-1.5 rounded text-sm text-white font-medium disabled:opacity-50 ${colorClass}`}>
          {state === "loading" ? "Sending…" : "Confirm"}
        </button>
        <button onClick={() => { setState("idle"); setReason(""); }}
          className="px-4 py-1.5 rounded border text-sm text-[var(--text-dim)] hover:text-white">
          Cancel
        </button>
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

  // Shorthand accessors for the nested structure
  const p        = profile;
  const player   = p?.player;
  const prof     = player?.profile;
  const role     = prof?.role;
  const userGuid = p?.guid ?? "—";

  return (
    <div className="flex flex-col gap-6">
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
        <div className="flex flex-col gap-4">

          {/* ── Account ── */}
          <div className="bg-[var(--panel)] border rounded-lg p-4">
            <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Account</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Username"   value={p?.username} />
              <Field label="Email"      value={p?.email} />
              <Field label="User GUID"  value={userGuid} mono />
              <Badge label="Verified"   value={p?.verified} />
              <Badge label="Allow Gifting"       value={player?.allowed_gift} />
              <Badge label="Marketplace Access"  value={p?.market_place_open} />
            </div>
          </div>

          {/* ── Player ── */}
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

          {/* ── Stats ── */}
          <div className="bg-[var(--panel)] border rounded-lg p-4">
            <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Stats</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Kills"          value={prof?.kills} />
              <Field label="Deaths"         value={prof?.deaths} />
              <Field label="Wins"           value={prof?.wins} />
              <Field label="Losses"         value={prof?.loses} />
              <Field label="Headshot Rate"  value={prof?.headshot_rate != null ? `${prof.headshot_rate}%` : null} />
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="bg-[var(--panel)] border rounded-lg p-4">
            <div className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-wider mb-3">Live Session Actions</div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="⚡ Ban Player"
                description="Kicks the player from a live server and writes an active-session ban."
                colorClass="bg-red-600 hover:bg-red-700"
                onConfirm={(reason) => postAction("banplayer", userGuid, reason)}
              />
              <ActionButton
                label="⏏ Disconnect"
                description="Disconnects the player from a live server. No ban is written."
                colorClass="bg-orange-600 hover:bg-orange-700"
                onConfirm={(reason) => postAction("dcplayer", userGuid, reason)}
              />
              <button
                onClick={() => userGuid !== "—" && onHwid(userGuid)}
                disabled={userGuid === "—"}
                className="px-4 py-2 rounded-md border border-blue-500/40 text-blue-400 text-sm hover:bg-blue-500/10 disabled:opacity-40 transition-colors"
              >
                View HWID Info →
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
