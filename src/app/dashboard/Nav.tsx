"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NavLink = { href: string; label: string };
type Section = { id: string; title: string; links: NavLink[] };

const SECTIONS: Section[] = [
  {
    id: "logs",
    title: "Logs",
    links: [
      { href: "/dashboard/logs/admin-logs",     label: "Admin Logs" },
      { href: "/dashboard/logs/match-results", label: "Match Results" },
    ],
  },
  {
    id: "screenshots",
    title: "Screenshots",
    links: [
      { href: "/dashboard/screenshots-v2", label: "Screenshots v2" },
      { href: "/dashboard/screenshots-v3", label: "Screenshots v3" },
    ],
  },
  {
    id: "players",
    title: "Players",
    links: [
      { href: "/dashboard/players", label: "Players" },
    ],
  },
  {
    id: "records",
    title: "Records",
    links: [
      { href: "/dashboard/live-matches",   label: "Search Matches" },
      { href: "/dashboard/detection-record", label: "Detection Records" },
      { href: "/dashboard/watchlist",      label: "Watch List" },
    ],
  },
  {
    id: "banning",
    title: "Banning",
    links: [
      { href: "/dashboard/hwid-manager",   label: "BAN — HWID" },
      { href: "/dashboard/ban",            label: "BAN — Account" },
      { href: "/dashboard/detections",     label: "Banned Players" },
    ],
  },
  {
    id: "payment",
    title: "Payment Issues",
    links: [
      { href: "/dashboard/topup-logs", label: "Top-Up Logs" },
      { href: "/dashboard/topup",      label: "Top-Up" },
      { href: "/dashboard/whitelist",  label: "Whitelist" },
    ],
  },
];

const STORAGE_KEY = "ag-nav-open";
const WORKER_API  = "https://crimson-art-23d9.secretlifestylejp.workers.dev/v2";
const STATS_REFRESH_MS = 30_000; // 30s

type UserStats = {
  onlinePlayers?: number;
  userCount?: number;
  user_count?: number;
  totalUsers?: number;
  bannedCount?: number;
  banned_count?: number;
};

export default function Nav({
  codename,
  roleName,
  onClose,
}: {
  codename: string;
  roleName: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // All sections open by default; hydrate from localStorage after mount
  const [open, setOpen] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.id, true]))
  );
  const [hydrated, setHydrated] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOpen(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

  // Poll /users/stats every 30s
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const t = await fetch("/api/admin-logs").then((r) => r.json() as Promise<{ token?: string }>);
        if (!t?.token || cancelled) return;
        const res = await fetch(`${WORKER_API}/users/stats`, {
          headers: { Authorization: `Bearer ${t.token}` },
        });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as UserStats;
        if (!cancelled) setStats(body);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) timer = setTimeout(load, STATS_REFRESH_MS);
      }
    }
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, []);

  const online    = stats?.onlinePlayers ?? null;
  const userCount = stats?.userCount     ?? stats?.user_count    ?? stats?.totalUsers     ?? null;
  const banned    = stats?.bannedCount   ?? stats?.banned_count  ?? null;

  function toggle(id: string) {
    setOpen((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 h-full shrink-0 border-r bg-[var(--panel)] flex flex-col">
      <div className="px-4 py-4 border-b flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-icon.png" alt="AlphaGuard" className="w-10 h-10 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold tracking-wide" style={{ color: "var(--accent)" }}>
            AlphaGuard
          </div>
          <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest">
            Anti-Cheat
          </div>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-1.5 rounded text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Stats panel */}
      <div className="px-3 py-3 border-b border-[var(--border)] bg-[var(--panel-2)]/30">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="flex flex-col items-center bg-[var(--panel)] rounded-md py-1.5 px-1 border border-emerald-700/30">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-300 tabular-nums">
                {online !== null ? online.toLocaleString() : "—"}
              </span>
            </div>
            <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mt-0.5">Online</span>
          </div>
          <div className="flex flex-col items-center bg-[var(--panel)] rounded-md py-1.5 px-1 border border-[var(--border)]">
            <span className="text-sm font-semibold text-white tabular-nums">
              {userCount !== null ? userCount.toLocaleString() : "—"}
            </span>
            <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mt-0.5">Users</span>
          </div>
          <div className="flex flex-col items-center bg-[var(--panel)] rounded-md py-1.5 px-1 border border-red-700/30">
            <span className="text-sm font-semibold text-red-400 tabular-nums">
              {banned !== null ? banned.toLocaleString() : "—"}
            </span>
            <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-wider mt-0.5">Banned</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((section) => {
          const isOpen = !hydrated || open[section.id] !== false;
          const hasActive = section.links.some((l) => pathname?.startsWith(l.href));

          return (
            <div key={section.id} className="mb-1">
              {/* Section header */}
              <button
                onClick={() => toggle(section.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors select-none ${
                  hasActive
                    ? "text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:text-[var(--accent)]"
                }`}
              >
                <span>{section.title}</span>
                <span className="text-[10px] opacity-60">
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>

              {/* Section links */}
              {isOpen && (
                <div className="mt-0.5 mb-1">
                  {section.links.map((l) => {
                    const active = pathname?.startsWith(l.href);
                    return (
                      <Link
                        key={l.href}
                        href={l.href}
                        className={`block pl-5 pr-3 py-1.5 rounded-md text-sm transition-colors ${
                          active
                            ? "bg-[var(--panel-2)] text-white"
                            : "text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]"
                        }`}
                      >
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t text-sm">
        <div className="px-2 py-1">
          <div className="truncate font-medium">{codename}</div>
          <div className="text-xs text-[var(--text-dim)] truncate">{roleName}</div>
        </div>
        <button
          onClick={logout}
          className="mt-2 w-full text-left px-3 py-2 rounded-md text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
