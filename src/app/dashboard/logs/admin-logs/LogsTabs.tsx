"use client";

import { useState } from "react";
import AdminLogsView from "./AdminLogsView";
import SystemLogsView from "../system-logs/SystemLogsView";
import SpBugView from "../sp-bug/SpBugView";
import GiftLogsView from "../gift-logs/GiftLogsView";
import ShopLogsView from "../shop-logs/ShopLogsView";

type Tab = "admin" | "system" | "gifts" | "shop" | "spbug";

const TABS: { id: Tab; label: string; amber?: boolean }[] = [
  { id: "admin",  label: "Admin Logs" },
  { id: "system", label: "System Logs" },
  { id: "gifts",  label: "Gifts" },
  { id: "shop",   label: "Shop Purchases" },
  { id: "spbug",  label: "⚠ SP BUG", amber: true },
];

export default function LogsTabs() {
  const [tab, setTab] = useState<Tab>("admin");

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
                ? t.amber
                  ? "border-amber-500 text-amber-300 bg-amber-900/20"
                  : "border-[var(--accent)] text-white bg-[var(--accent)]/15"
                : t.amber
                  ? "border-transparent text-amber-500/70 hover:text-amber-300 hover:bg-amber-900/10 hover:border-amber-700/40"
                  : "border-transparent text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]/60 hover:border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "admin"  && <AdminLogsView />}
      {tab === "system" && <SystemLogsView />}
      {tab === "gifts"  && <GiftLogsView />}
      {tab === "shop"   && <ShopLogsView />}
      {tab === "spbug"  && <SpBugView />}
    </>
  );
}
