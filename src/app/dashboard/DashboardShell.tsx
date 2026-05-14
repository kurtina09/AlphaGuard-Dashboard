"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Nav from "./Nav";

export default function DashboardShell({
  children,
  codename,
  roleName,
}: {
  children: React.ReactNode;
  codename: string;
  roleName: string;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer whenever the route changes
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (navOpen) document.body.style.overflow = "hidden";
    else         document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [navOpen]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* ── Mobile backdrop ── */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* ── Sidebar (drawer on mobile, static on desktop) ── */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-50 h-full
          transition-transform duration-200 ease-in-out
          ${navOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <Nav
          codename={codename}
          roleName={roleName}
          onClose={() => setNavOpen(false)}
        />
      </div>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 h-12 border-b border-[var(--border)] bg-[var(--panel)] shrink-0 z-30">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            className="p-1.5 rounded text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)] transition-colors"
          >
            {/* Hamburger icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
              <rect y="2"  width="18" height="2" rx="1"/>
              <rect y="8"  width="18" height="2" rx="1"/>
              <rect y="14" width="18" height="2" rx="1"/>
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="AlphaGuard" className="w-6 h-6" />
          <span className="font-bold text-sm tracking-wide" style={{ color: "var(--accent)" }}>
            AlphaGuard
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto overflow-x-clip">
          {children}
        </main>
      </div>
    </div>
  );
}
