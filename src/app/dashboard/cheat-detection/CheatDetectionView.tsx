"use client";

import { useEffect, useRef, useState } from "react";

/* ── Types ────────────────────────────────────────────────── */
type Rule = { id: number; label: string; description: string; enabled: boolean };
type SampleMeta = { id: number; label: string; created_at: string };
type FlaggedEntry = {
  id: string;
  player_guid: string;
  screenshot_time: string;
  flagged_at: string;
  verdict: string;
  rules_triggered: string[];
};
type Screenshot = { unique_id: string; player_guid: string; time: string };

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

/* ══════════════════════════════════════════════════════════ */
/* Tab 1 — Rules                                             */
/* ══════════════════════════════════════════════════════════ */
function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => { fetchRules(); }, []);

  async function fetchRules() {
    const res = await fetch("/api/detection-rules");
    const body = await res.json();
    setRules(body.rules ?? []);
  }

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null); setFormSuccess(false); setSubmitting(true);
    try {
      const res = await fetch("/api/detection-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, description }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setFormSuccess(true); setLabel(""); setDescription(""); fetchRules();
    } catch (err) { setFormError(err instanceof Error ? err.message : "Failed."); }
    finally { setSubmitting(false); }
  }

  async function toggleRule(id: number, enabled: boolean) {
    await fetch(`/api/detection-rules/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setRules((p) => p.map((r) => r.id === id ? { ...r, enabled } : r));
  }

  async function deleteRule(id: number) {
    setDeleting(id);
    await fetch(`/api/detection-rules/${id}`, { method: "DELETE" });
    setRules((p) => p.filter((r) => r.id !== id));
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addRule} className="bg-[var(--panel)] border rounded-lg p-6 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">Add Detection Rule</h2>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Rule Name</label>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required
            placeholder='e.g. "Cheat Menu Visible"'
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">What to look for</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4}
            placeholder='Describe the visual indicator clearly, e.g. "A cheat/hack menu or trainer panel is visible on screen."'
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] resize-none" />
          <p className="text-xs text-[var(--text-dim)]">Be descriptive — this is sent directly to the AI when scanning.</p>
        </div>
        {formError && <p className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">{formError}</p>}
        {formSuccess && <p className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">Rule added.</p>}
        <button type="submit" disabled={submitting}
          className="w-full py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
          {submitting ? "Adding…" : "Add Rule"}
        </button>
      </form>

      <div className="bg-[var(--panel)] border rounded-lg overflow-hidden max-w-xl">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Active Rules <span className="text-xs text-[var(--text-dim)] ml-1">({rules.filter(r=>r.enabled).length} enabled)</span></h2>
        </div>
        {rules.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">No rules yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--panel-2)]">
            {rules.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                <button onClick={() => toggleRule(r.id, !r.enabled)}
                  className={`mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors relative ${r.enabled ? "bg-[var(--accent)]" : "bg-[var(--panel-2)]"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.label}</div>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5 line-clamp-2">{r.description}</p>
                </div>
                <button onClick={() => deleteRule(r.id)} disabled={deleting === r.id}
                  className="shrink-0 text-xs px-2 py-1 rounded border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-40">
                  {deleting === r.id ? "…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* Tab 2 — Samples                                           */
/* ══════════════════════════════════════════════════════════ */
function SamplesTab() {
  const [samples, setSamples] = useState<SampleMeta[]>([]);
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchSamples(); }, []);

  async function fetchSamples() {
    const res = await fetch("/api/cheat-samples");
    const body = await res.json();
    setSamples(body.samples ?? []);
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null); setSuccess(false); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("label", label || file.name);
      const res = await fetch("/api/cheat-samples", { method: "POST", body: fd });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setSuccess(true); setLabel(""); setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      fetchSamples();
    } catch (err) { setError(err instanceof Error ? err.message : "Upload failed."); }
    finally { setUploading(false); }
  }

  async function deleteSample(id: number) {
    setDeleting(id);
    await fetch(`/api/cheat-samples/${id}`, { method: "DELETE" });
    setSamples((p) => p.filter((s) => s.id !== id));
    setDeleting(null);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-[var(--panel)] border rounded-lg p-5 space-y-1.5">
        <h2 className="text-sm font-semibold mb-3">What are samples?</h2>
        <p className="text-sm text-[var(--text-dim)]">
          Upload 1–5 screenshots you <span className="text-white font-medium">already know</span> show cheating.
          The AI uses these as visual references when scanning new screenshots, making detection much more accurate.
        </p>
        <p className="text-xs text-[var(--text-dim)] pt-1">Max 5 samples · Max 2 MB each · Any image format</p>
      </div>

      <form onSubmit={upload} className="bg-[var(--panel)] border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">Upload Sample</h2>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Label <span className="text-[var(--text-dim)] font-normal">(optional)</span></label>
          <input value={label} onChange={(e) => setLabel(e.target.value)}
            placeholder='e.g. "Aimbot visible in killcam"'
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]" />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Screenshot file</label>
          <input ref={inputRef} type="file" accept="image/*" required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-[var(--text-dim)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:text-sm file:bg-[var(--panel-2)] file:text-[var(--text-dim)] hover:file:text-white" />
        </div>
        {error && <p className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">{error}</p>}
        {success && <p className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">Sample uploaded.</p>}
        <button type="submit" disabled={uploading || !file || samples.length >= 5}
          className="w-full py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed">
          {uploading ? "Uploading…" : samples.length >= 5 ? "Max samples reached" : "Upload Sample"}
        </button>
      </form>

      {samples.length > 0 && (
        <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold">Uploaded Samples ({samples.length}/5)</div>
          <ul className="divide-y divide-[var(--panel-2)]">
            {samples.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.label}</div>
                  <div className="text-xs text-[var(--text-dim)]">{fmtDate(s.created_at)}</div>
                </div>
                <button onClick={() => deleteSample(s.id)} disabled={deleting === s.id}
                  className="text-xs px-2 py-1 rounded border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-40">
                  {deleting === s.id ? "…" : "Remove"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* Tab 3 — Batch Scan                                        */
/* ══════════════════════════════════════════════════════════ */
type ScanState = "idle" | "fetching" | "scanning" | "done" | "aborted";

function BatchScanTab({ onFlaggedChange }: { onFlaggedChange: () => void }) {
  const [scope, setScope] = useState<"latest" | "guid">("latest");
  const [latestCount, setLatestCount] = useState(100);
  const [guidInput, setGuidInput] = useState("");

  const [state, setState] = useState<ScanState>("idle");
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [currentGuid, setCurrentGuid] = useState("");
  const [liveResults, setLiveResults] = useState<{ guid: string; id: string; verdict: string }[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const abortRef = useRef(false);

  async function startScan() {
    abortRef.current = false;
    setScanError(null);
    setLiveResults([]);
    setFlaggedCount(0);
    setDone(0);
    setState("fetching");

    // Fetch screenshot list
    let screenshots: Screenshot[] = [];
    try {
      if (scope === "guid") {
        // Fetch all pages for this GUID
        const firstRes = await fetch(`/api/screenshots?page=0&size=200&player_guid=${encodeURIComponent(guidInput.trim())}`);
        const firstBody = await firstRes.json();
        if (!firstRes.ok) throw new Error(firstBody.error || "Failed to fetch screenshots");
        screenshots = firstBody.items as Screenshot[];
        const totalPages: number = firstBody.total_pages ?? 1;
        for (let p = 1; p < totalPages && !abortRef.current; p++) {
          const r = await fetch(`/api/screenshots?page=${p}&size=200&player_guid=${encodeURIComponent(guidInput.trim())}`);
          const b = await r.json();
          screenshots = [...screenshots, ...(b.items as Screenshot[])];
        }
      } else {
        // Latest N across all players — fetch page by page until we have enough
        const pageSize = 200;
        let collected: Screenshot[] = [];
        for (let p = 0; collected.length < latestCount && !abortRef.current; p++) {
          const r = await fetch(`/api/screenshots?page=${p}&size=${pageSize}`);
          const b = await r.json();
          if (!r.ok || !b.items?.length) break;
          collected = [...collected, ...(b.items as Screenshot[])];
          if (b.last) break;
        }
        screenshots = collected.slice(0, latestCount);
      }
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Failed to fetch screenshots.");
      setState("idle");
      return;
    }

    if (!screenshots.length) {
      setScanError("No screenshots found for the selected scope.");
      setState("idle");
      return;
    }

    setTotal(screenshots.length);
    setState("scanning");

    // Analyze sequentially
    let flagged = 0;
    for (let i = 0; i < screenshots.length; i++) {
      if (abortRef.current) { setState("aborted"); return; }
      const shot = screenshots[i];
      setCurrentGuid(shot.player_guid);
      try {
        const res = await fetch("/api/analyze-screenshot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            unique_id: shot.unique_id,
            player_guid: shot.player_guid,
            screenshot_time: shot.time,
          }),
        });
        const body = await res.json();
        if (res.ok && body.flagged) {
          flagged++;
          setFlaggedCount(flagged);
          setLiveResults((p) => [{ guid: shot.player_guid, id: shot.unique_id, verdict: body.verdict }, ...p]);
          onFlaggedChange();
        }
      } catch { /* skip individual failures */ }
      setDone(i + 1);
    }
    setState("done");
  }

  function abort() {
    abortRef.current = true;
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="max-w-xl space-y-6">
      {/* Config */}
      <div className="bg-[var(--panel)] border rounded-lg p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">Scan Scope</h2>

        <div className="flex gap-2">
          {(["latest", "guid"] as const).map((s) => (
            <button key={s} onClick={() => setScope(s)} disabled={state === "scanning" || state === "fetching"}
              className={`flex-1 py-2 rounded-md border text-sm font-medium transition-colors ${scope === s ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "text-[var(--text-dim)] hover:text-white"}`}>
              {s === "latest" ? "Latest screenshots" : "By Player GUID"}
            </button>
          ))}
        </div>

        {scope === "latest" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">How many to scan</label>
            <div className="flex flex-wrap gap-2">
              {[50, 100, 200, 500].map((n) => (
                <button key={n} onClick={() => setLatestCount(n)}
                  disabled={state === "scanning" || state === "fetching"}
                  className={`px-4 py-1.5 rounded-md border text-sm transition-colors ${latestCount === n ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "text-[var(--text-dim)] hover:text-white"}`}>
                  {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-[var(--text-dim)]">Scans the {latestCount} most recent screenshots across all players.</p>
          </div>
        )}

        {scope === "guid" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Player GUID</label>
            <input value={guidInput} onChange={(e) => setGuidInput(e.target.value)}
              disabled={state === "scanning" || state === "fetching"}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm font-mono outline-none focus:border-[var(--accent)]" />
            <p className="text-xs text-[var(--text-dim)]">Scans all screenshots for this specific player.</p>
          </div>
        )}

        {scanError && <p className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">{scanError}</p>}

        <div className="flex gap-2">
          <button
            onClick={startScan}
            disabled={state === "scanning" || state === "fetching" || (scope === "guid" && !guidInput.trim())}
            className="flex-1 py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "fetching" ? "Fetching screenshots…" : state === "scanning" ? "Scanning…" : "Start Scan"}
          </button>
          {(state === "scanning" || state === "fetching") && (
            <button onClick={abort}
              className="px-4 py-2 rounded-md border text-sm text-[var(--danger)] hover:bg-[var(--danger)]/10">
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {(state === "scanning" || state === "fetching" || state === "done" || state === "aborted") && (
        <div className="bg-[var(--panel)] border rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              {state === "fetching" && "Fetching screenshot list…"}
              {state === "scanning" && `Analyzing ${done} / ${total}`}
              {state === "done" && `Scan complete — ${total} analyzed`}
              {state === "aborted" && `Stopped at ${done} / ${total}`}
            </span>
            <span className={`font-semibold ${flaggedCount > 0 ? "text-red-400" : "text-[var(--text-dim)]"}`}>
              {flaggedCount} flagged
            </span>
          </div>

          {state !== "fetching" && (
            <div className="w-full bg-[var(--panel-2)] rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${state === "done" ? "bg-green-500" : state === "aborted" ? "bg-yellow-500" : "bg-[var(--accent)]"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {state === "scanning" && currentGuid && (
            <p className="text-xs text-[var(--text-dim)] font-mono truncate">Checking: {currentGuid}</p>
          )}

          {liveResults.length > 0 && (
            <div className="space-y-2 mt-2">
              <p className="text-xs font-semibold text-red-400">⚑ Flagged so far:</p>
              {liveResults.slice(0, 5).map((r) => (
                <div key={r.id} className="bg-red-900/20 border border-red-500/30 rounded-md px-3 py-2 text-xs">
                  <div className="font-mono text-[var(--text-dim)] truncate">{r.guid}</div>
                  <div className="text-white mt-0.5">{r.verdict}</div>
                </div>
              ))}
              {liveResults.length > 5 && (
                <p className="text-xs text-[var(--text-dim)]">+{liveResults.length - 5} more — see Flagged tab</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* Tab 4 — Flagged                                           */
/* ══════════════════════════════════════════════════════════ */
function FlaggedTab({ refresh }: { refresh: number }) {
  const [items, setItems] = useState<FlaggedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/flagged-screenshots");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setItems(body.items ?? []);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed."); }
    finally { setLoading(false); }
  }

  async function dismiss(id: string) {
    setDeleting(id);
    await fetch(`/api/flagged-screenshots/${id}`, { method: "DELETE" });
    setItems((p) => p.filter((e) => e.id !== id));
    setDeleting(null);
  }

  const q = search.trim().toLowerCase();
  const filtered = q ? items.filter((e) =>
    e.player_guid.toLowerCase().includes(q) ||
    e.verdict.toLowerCase().includes(q) ||
    e.rules_triggered.some((r) => r.toLowerCase().includes(q))
  ) : items;

  return (
    <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <h2 className="text-sm font-semibold shrink-0">
          Flagged Screenshots
          {items.length > 0 && <span className="ml-1.5 text-xs text-[var(--text-dim)]">({items.length})</span>}
        </h2>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search GUID or verdict…"
          className="flex-1 max-w-xs px-3 py-1.5 bg-[var(--panel-2)] border rounded-md text-xs outline-none focus:border-[var(--accent)]" />
        <button onClick={load} disabled={loading}
          className="shrink-0 text-xs px-3 py-1 rounded-md border text-[var(--text-dim)] hover:text-white disabled:opacity-40">
          {loading ? "…" : "Refresh"}
        </button>
      </div>

      {loading && <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">Loading…</p>}
      {error && <p className="px-4 py-8 text-center text-sm text-[var(--danger)]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">No flagged screenshots yet. Run a batch scan first.</p>
      )}
      {!loading && items.length > 0 && filtered.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">No results for &ldquo;{search}&rdquo;</p>
      )}

      {filtered.length > 0 && (
        <ul className="divide-y divide-[var(--panel-2)]">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/screenshots/${item.id}`} alt="screenshot"
                className="w-28 h-16 object-cover rounded border shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-[var(--text-dim)] truncate">{item.player_guid}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 font-medium shrink-0">⚑ Flagged</span>
                </div>
                <p className="text-sm">{item.verdict}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {item.rules_triggered.map((r) => (
                    <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-[var(--panel-2)] text-[var(--text-dim)]">{r}</span>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-dim)] mt-1">
                  Screenshot: {fmtDate(item.screenshot_time)} · Flagged: {fmtDate(item.flagged_at)}
                </p>
              </div>
              <button onClick={() => dismiss(item.id)} disabled={deleting === item.id}
                className="shrink-0 text-xs px-3 py-1 rounded border text-[var(--text-dim)] hover:text-white disabled:opacity-40">
                {deleting === item.id ? "…" : "Dismiss"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/* Root view                                                 */
/* ══════════════════════════════════════════════════════════ */
export default function CheatDetectionView() {
  const [tab, setTab] = useState<"rules" | "samples" | "scan" | "flagged">("rules");
  const [flaggedRefresh, setFlaggedRefresh] = useState(0);

  const TABS = [
    { key: "rules",   label: "1. Detection Rules" },
    { key: "samples", label: "2. Sample Screenshots" },
    { key: "scan",    label: "3. Batch Scan" },
    { key: "flagged", label: "Flagged" },
  ] as const;

  return (
    <div>
      <div className="flex gap-1 mb-6 border-b flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.key ? "border-[var(--accent)] text-white" : "border-transparent text-[var(--text-dim)] hover:text-white"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rules"   && <RulesTab />}
      {tab === "samples" && <SamplesTab />}
      {tab === "scan"    && <BatchScanTab onFlaggedChange={() => setFlaggedRefresh((n) => n + 1)} />}
      {tab === "flagged" && <FlaggedTab refresh={flaggedRefresh} />}
    </div>
  );
}
