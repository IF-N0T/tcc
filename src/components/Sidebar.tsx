"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Activity, FolderKanban, LayoutDashboard, Search, ShieldCheck } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Casos", icon: FolderKanban },
  { href: "/search", label: "Central de Investigação", icon: Search }
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-[78px] shrink-0 bg-ink-900 text-gray-200 flex flex-col h-screen sticky top-0 border-r border-white/10">
      <div className="px-3 py-5 flex justify-center border-b border-white/10">
        <div className="w-10 h-10 overflow-hidden rounded-xl bg-brand-700 shadow-lg shadow-black/20">
          <img src="/sherlock-logo.png" alt="Sherlock" className="h-full w-full object-cover" />
        </div>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              className={clsx(
                "group relative flex h-12 w-12 items-center justify-center rounded-xl text-sm transition-all duration-200",
                active
                  ? "bg-brand-700 text-white shadow-md shadow-brand-950/30"
                  : "text-gray-400 hover:bg-white/10 hover:text-brand-200"
              )}
            >
              <Icon size={21} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" />
              <span className="pointer-events-none absolute left-[60px] z-20 hidden whitespace-nowrap rounded-md bg-ink-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
                {item.label}
              </span>
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <Link
            href="/admin/audit"
            aria-label="Auditoria (Admin)"
            title="Auditoria (Admin)"
            className={clsx(
              "group relative flex h-12 w-12 items-center justify-center rounded-xl text-sm transition-all duration-200",
              pathname.startsWith("/admin")
                ? "bg-brand-700 text-white shadow-md shadow-brand-950/30"
                : "text-gray-400 hover:bg-white/10 hover:text-brand-200"
            )}
          >
            <ShieldCheck size={21} strokeWidth={pathname.startsWith("/admin") ? 2.4 : 1.8} aria-hidden="true" />
            <span className="pointer-events-none absolute left-[60px] z-20 hidden whitespace-nowrap rounded-md bg-ink-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg group-hover:block">
              Auditoria (Admin)
            </span>
          </Link>
        )}
      </nav>

      <div className="flex justify-center border-t border-white/10 px-3 py-4 text-gray-500" title="Uso restrito a peritos autorizados">
        <Activity size={16} aria-hidden="true" />
      </div>
    </aside>
  );
}
