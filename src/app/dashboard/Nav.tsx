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
      { href: "/dashboard/topup",     label: "Top-Up" },
      { href: "/dashboard/whitelist", label: "Whitelist" },
    ],
  },
];

const STORAGE_KEY = "ag-nav-open";

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setOpen(JSON.parse(saved));
    } catch {}
    setHydrated(true);
  }, []);

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
