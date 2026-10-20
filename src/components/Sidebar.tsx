"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  Archive,
  Bot,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Plug,
  Search,
  ShieldCheck,
  Users,
  Workflow
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "Casos", icon: FolderKanban },
  { href: "/search", label: "Central de Investigação", icon: Search },
  { href: "/analyses", label: "Análises forenses", icon: Workflow },
  { href: "/reports", label: "Laudos e relatórios", icon: FileText },
  { href: "/assistant", label: "Assistente Sherlock", icon: Bot },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/backup", label: "Backup e recuperação", icon: Archive }
];

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-white/10 bg-ink-900 text-gray-200 md:sticky md:top-0 md:flex md:h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 md:px-5 md:py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
          <img src="/sherlock-logo.png" alt="" className="h-full w-full object-contain" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Sherlock</div>
          <div className="text-xs text-gray-400">Perícia digital</div>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-1 md:overflow-x-visible md:overflow-y-auto md:px-3 md:py-5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm transition-colors md:w-full",
                active
                  ? "bg-brand-700 text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}

        {role === "ADMIN" && (
          <>
            <div className="hidden px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500 md:block">
              Administração
            </div>
            {[
              { href: "/admin/users", label: "Usuários", icon: Users },
              { href: "/admin/audit", label: "Auditoria", icon: ShieldCheck }
            ].map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm transition-colors md:w-full",
                    active ? "bg-brand-700 text-white" : "text-gray-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="hidden items-center gap-2 border-t border-white/10 px-4 py-4 text-xs text-gray-500 md:flex">
        <Activity size={16} aria-hidden="true" />
        <span>Uso restrito a peritos autorizados</span>
      </div>
    </aside>
  );
}
