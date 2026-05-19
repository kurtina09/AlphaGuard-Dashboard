"use client";

import { useEffect, useState } from "react";
import PlayersSearchView from "./PlayersSearchView";
import PlayerProfileView from "./PlayerProfileView";
import PlayerHwidView from "./PlayerHwidView";

type Tab = "search" | "profile";

const TABS: { id: Tab; label: string }[] = [
  { id: "search",  label: "Search Players" },
  { id: "profile", label: "Player Profile" },
];

export default function PlayersTabs() {
  const [tab,           setTab]           = useState<Tab>("search");
  const [focusedGuid,   setFocusedGuid]   = useState("");
  const [hwidModalGuid, setHwidModalGuid] = useState<string | null>(null);

  function goToProfile(guid: string) {
    setFocusedGuid(guid);
    setTab("profile");
  }

  function openHwidModal(guid: string) {
    setHwidModalGuid(guid);
  }

  // Close modal on Escape
  useEffect(() => {
    if (!hwidModalGuid) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setHwidModalGuid(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hwidModalGuid]);

  return (
    <>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-0 mb-6 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap rounded-t-md ${
              tab === t.id
                ? "border-[var(--accent)] text-white bg-[var(--accent)]/15"
                : "border-transparent text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]/60 hover:border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search"  && <PlayersSearchView onProfile={goToProfile} onHwid={openHwidModal} />}
      {tab === "profile" && <PlayerProfileView guid={focusedGuid} onHwid={openHwidModal} />}

      {/* HWID modal */}
      {hwidModalGuid && (
        <div
          onClick={() => setHwidModalGuid(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--panel-2)]/60">
              <div className="flex flex-col">
                <h2 className="text-base font-semibold text-white">HWID Info</h2>
                <span className="font-mono text-[10px] text-[var(--text-dim)] truncate max-w-[400px]" title={hwidModalGuid}>
                  {hwidModalGuid}
                </span>
              </div>
              <button
                onClick={() => setHwidModalGuid(null)}
                aria-label="Close"
                className="p-1.5 rounded text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto p-5">
              <PlayerHwidView guid={hwidModalGuid} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
