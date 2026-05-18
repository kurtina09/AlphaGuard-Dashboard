"use client";

import { useState } from "react";
import PlayersSearchView from "./PlayersSearchView";
import PlayerProfileView from "./PlayerProfileView";
import PlayerHwidView from "./PlayerHwidView";

type Tab = "search" | "profile" | "hwid";

const TABS: { id: Tab; label: string }[] = [
  { id: "search",  label: "Search Players" },
  { id: "profile", label: "Player Profile" },
  { id: "hwid",    label: "HWID Info" },
];

export default function PlayersTabs() {
  const [tab,          setTab]          = useState<Tab>("search");
  const [focusedGuid,  setFocusedGuid]  = useState("");

  function goToProfile(guid: string) {
    setFocusedGuid(guid);
    setTab("profile");
  }

  function goToHwid(guid: string) {
    setFocusedGuid(guid);
    setTab("hwid");
  }

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

      {tab === "search"  && <PlayersSearchView onProfile={goToProfile} onHwid={goToHwid} />}
      {tab === "profile" && <PlayerProfileView guid={focusedGuid} onHwid={goToHwid} />}
      {tab === "hwid"    && <PlayerHwidView    guid={focusedGuid} />}
    </>
  );
}
