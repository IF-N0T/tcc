"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/cases", label: "Casos", icon: "🗂️" },
  { href: "/search", label: "Central de Investigação", icon: "🔎" }
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 bg-ink-900 text-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-5 py-5 flex items-center gap-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-md bg-brand-700 flex items-center justify-center font-bold text-white">
          S
        </div>
        <div>
          <div className="font-semibold text-white leading-none">Sherlock</div>
          <div className="text-[11px] text-gray-400">Perícia Digital</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-brand-700 text-white" : "text-gray-300 hover:bg-white/5"
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <Link
            href="/admin/audit"
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith("/admin") ? "bg-brand-700 text-white" : "text-gray-300 hover:bg-white/5"
            )}
          >
            <span>🛡️</span>
            <span>Auditoria (Admin)</span>
          </Link>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-gray-500">
        Sherlock MVP · uso restrito a peritos autorizados
      </div>
    </aside>
  );
}
