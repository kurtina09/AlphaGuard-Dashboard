"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Nav({
  codename,
  roleName,
}: {
  codename: string;
  roleName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard/screenshots", label: "Screenshots" },
    { href: "/dashboard/ban", label: "Ban / Kick" },
    { href: "/dashboard/detections", label: "Detections" },
    { href: "/dashboard/live-matches", label: "Search Matches" },
    { href: "/dashboard/watchlist", label: "Watch List" },
    { href: "/dashboard/topup", label: "Top-Up" },
  ];

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-[var(--panel)] flex flex-col">
      <div className="px-5 py-5 border-b">
        <div className="text-lg font-semibold">AlphaGuard</div>
        <div className="text-xs text-[var(--text-dim)]">Anti-Cheat Portal</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => {
          const active = pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block px-3 py-2 rounded-md text-sm ${
                active
                  ? "bg-[var(--panel-2)] text-white"
                  : "text-[var(--text-dim)] hover:text-white hover:bg-[var(--panel-2)]"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t text-sm">
        <div className="px-2 py-1">
          <div className="truncate font-medium">{codename}</div>
          <div className="text-xs text-[var(--text-dim)] truncate">
            {roleName}
          </div>
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
