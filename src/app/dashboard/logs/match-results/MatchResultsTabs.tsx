"use client";

import { useState } from "react";
import MatchResultsView from "./MatchResultsView";
import MatchSummaryView from "./MatchSummaryView";

type Tab = "log" | "summary";

export default function MatchResultsTabs() {
  const [tab, setTab] = useState<Tab>("log");

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-[var(--border)]">
        {(
          [
            { id: "log",     label: "Match Log" },
            { id: "summary", label: "Summary / Aggregates" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px rounded-t-md ${
              tab === t.id
                ? "border-[var(--accent)] text-white bg-[var(--accent)]/15"
                : "border-transparent text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]/60 hover:border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "log"     && <MatchResultsView />}
      {tab === "summary" && <MatchSummaryView />}
    </>
  );
}
