"use client";

import { useState } from "react";
import AdminLogsView from "./AdminLogsView";
import SystemLogsView from "../system-logs/SystemLogsView";
import TransactionLogsView from "../transaction-logs/TransactionLogsView";

type Tab = "admin" | "system" | "transactions";

const TABS: { id: Tab; label: string }[] = [
  { id: "admin",        label: "Admin Logs" },
  { id: "system",       label: "System Logs" },
  { id: "transactions", label: "Transactions / Shop" },
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
                ? "border-[var(--accent)] text-white bg-[var(--accent)]/15"
                : "border-transparent text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]/60 hover:border-[var(--border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "admin"        && <AdminLogsView />}
      {tab === "system"       && <SystemLogsView />}
      {tab === "transactions" && <TransactionLogsView />}
    </>
  );
}
