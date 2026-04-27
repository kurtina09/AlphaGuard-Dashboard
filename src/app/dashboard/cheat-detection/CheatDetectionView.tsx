"use client";

import { useEffect, useState } from "react";

type Rule = {
  id: number;
  label: string;
  description: string;
  enabled: boolean;
  created_at: string;
};

type FlaggedEntry = {
  id: string;
  player_guid: string;
  screenshot_time: string;
  flagged_at: string;
  verdict: string;
  rules_triggered: string[];
};

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString("en-PH", { timeZone: "Asia/Manila" });
}

/* ── Rules tab ────────────────────────────────────────────── */
function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function loadRules() {
    setLoading(true);
    try {
      const res = await fetch("/api/detection-rules");
      const body = await res.json();
      setRules(body.rules ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadRules(); }, []);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/detection-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, description }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setFormSuccess(true);
      setLabel("");
      setDescription("");
      loadRules();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleRule(id: number, enabled: boolean) {
    await fetch(`/api/detection-rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled } : r));
  }

  async function deleteRule(id: number) {
    setDeleting(id);
    try {
      await fetch(`/api/detection-rules/${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Add rule form */}
      <form onSubmit={addRule} className="bg-[var(--panel)] border rounded-lg p-6 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold text-[var(--text-dim)] uppercase tracking-wide">
          Add Detection Rule
        </h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">Rule Name</label>
          <input
            type="text"
            value={label}
            onChange={(e) => { setLabel(e.target.value); setFormError(null); setFormSuccess(false); }}
            placeholder='e.g. "Cheat Menu Visible"'
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium">What to look for</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setFormError(null); setFormSuccess(false); }}
            placeholder='Describe the visual indicator in detail, e.g. "A cheat menu or overlay panel is visible on screen showing options like aimbot, wallhack, or speed settings."'
            rows={4}
            required
            className="w-full px-3 py-2 bg-[var(--panel-2)] border rounded-md text-sm outline-none focus:border-[var(--accent)] resize-none"
          />
          <p className="text-xs text-[var(--text-dim)]">
            Be descriptive — this text is sent directly to the AI when analyzing screenshots.
          </p>
        </div>

        {formError && (
          <p className="text-sm text-[var(--danger)] border border-[var(--danger)]/40 bg-[var(--danger)]/10 rounded-md px-3 py-2">{formError}</p>
        )}
        {formSuccess && (
          <p className="text-sm text-green-400 border border-green-400/40 bg-green-400/10 rounded-md px-3 py-2">Rule added.</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2 rounded-md bg-[var(--accent)] text-white font-medium hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? "Adding…" : "Add Rule"}
        </button>
      </form>

      {/* Rules list */}
      <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">
            Detection Rules
            <span className="ml-2 text-xs text-[var(--text-dim)]">
              ({rules.filter((r) => r.enabled).length} active)
            </span>
          </h2>
          <button onClick={loadRules} disabled={loading} className="text-xs px-3 py-1 rounded-md border text-[var(--text-dim)] hover:text-white disabled:opacity-40">
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {rules.length === 0 && !loading && (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">
            No rules yet. Add your first rule above.
          </p>
        )}

        {rules.length > 0 && (
          <ul className="divide-y divide-[var(--panel-2)]">
            {rules.map((r) => (
              <li key={r.id} className="px-4 py-3 flex items-start gap-3">
                {/* Toggle */}
                <button
                  onClick={() => toggleRule(r.id, !r.enabled)}
                  title={r.enabled ? "Disable rule" : "Enable rule"}
                  className={`mt-0.5 shrink-0 w-9 h-5 rounded-full transition-colors relative ${r.enabled ? "bg-[var(--accent)]" : "bg-[var(--panel-2)]"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{r.label}</span>
                    {!r.enabled && (
                      <span className="text-xs text-[var(--text-dim)] border rounded px-1">disabled</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-dim)] mt-0.5 line-clamp-2">{r.description}</p>
                </div>

                <button
                  onClick={() => deleteRule(r.id)}
                  disabled={deleting === r.id}
                  className="shrink-0 text-xs px-2 py-1 rounded border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10 disabled:opacity-40"
                >
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

/* ── Flagged tab ───────────────────────────────────────────── */
function FlaggedTab() {
  const [items, setItems] = useState<FlaggedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flagged-screenshots");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setItems(body.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function dismiss(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/flagged-screenshots/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="bg-[var(--panel)] border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">
          Flagged Screenshots
          {items.length > 0 && <span className="ml-2 text-xs text-[var(--text-dim)]">({items.length})</span>}
        </h2>
        <button onClick={load} disabled={loading} className="text-xs px-3 py-1 rounded-md border text-[var(--text-dim)] hover:text-white disabled:opacity-40">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {loading && <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">Loading…</p>}
      {error && <p className="px-4 py-8 text-center text-sm text-[var(--danger)]">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="px-4 py-8 text-center text-sm text-[var(--text-dim)]">
          No flagged screenshots yet. Use the Analyze button inside a screenshot to run detection.
        </p>
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-[var(--panel-2)]">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/screenshots/${item.id}`}
                  alt="screenshot"
                  className="w-24 h-14 object-cover rounded border shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-[var(--text-dim)] truncate">{item.player_guid}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-red-900/60 text-red-300 font-medium">⚑ Flagged</span>
                  </div>
                  <p className="text-sm mt-1">{item.verdict}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.rules_triggered.map((r) => (
                      <span key={r} className="text-xs px-1.5 py-0.5 rounded bg-[var(--panel-2)] text-[var(--text-dim)]">{r}</span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--text-dim)] mt-1">Flagged {fmtDate(item.flagged_at)}</p>

                  {/* Expand for details */}
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="text-xs text-[var(--accent)] mt-1 hover:underline"
                  >
                    {expanded === item.id ? "Hide details" : "Show details"}
                  </button>
                </div>

                <button
                  onClick={() => dismiss(item.id)}
                  disabled={deleting === item.id}
                  className="shrink-0 text-xs px-3 py-1 rounded border text-[var(--text-dim)] hover:text-white disabled:opacity-40"
                >
                  {deleting === item.id ? "…" : "Dismiss"}
                </button>
              </div>

              {expanded === item.id && (
                <div className="mt-3 ml-[6.5rem] text-xs text-[var(--text-dim)] bg-[var(--panel-2)] rounded-md p-3 leading-relaxed">
                  {/* Details come from the analysis but aren't stored — verdict is the summary */}
                  <span className="text-white font-medium">Triggered rules: </span>
                  {item.rules_triggered.join(", ") || "—"}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────── */
export default function CheatDetectionView() {
  const [tab, setTab] = useState<"rules" | "flagged">("rules");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["rules", "flagged"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-[var(--accent)] text-white"
                : "border-transparent text-[var(--text-dim)] hover:text-white"
            }`}
          >
            {t === "rules" ? "Detection Rules" : "Flagged Screenshots"}
          </button>
        ))}
      </div>

      {tab === "rules" && <RulesTab />}
      {tab === "flagged" && <FlaggedTab />}
    </div>
  );
}
