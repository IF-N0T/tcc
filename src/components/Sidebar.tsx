"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Archive, BookOpen, Bot, ChevronsLeft, ChevronsRight, FileText, FolderKanban, LayoutDashboard, Plug, Search, ShieldCheck, Users, Workflow, X, type LucideIcon } from "lucide-react";

type Item = { href: string; label: string; icon: LucideIcon; roles?: string[] };
const GROUPS: { title: string; items: Item[] }[] = [
  { title: "Investigação", items: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/cases", label: "Casos", icon: FolderKanban },
    { href: "/search", label: "Central de Investigação", icon: Search },
    { href: "/analyses", label: "Análises forenses", icon: Workflow }
  ] },
  { title: "Watson", items: [
    { href: "/assistant", label: "Assistente Watson", icon: Bot },
    { href: "/library", label: "Biblioteca Watson", icon: BookOpen }
  ] },
  { title: "Documentos e dados", items: [
    { href: "/reports", label: "Laudos e relatórios", icon: FileText },
    { href: "/integrations", label: "Integrações", icon: Plug }
  ] },
  { title: "Administração", items: [
    { href: "/admin/users", label: "Contas e acesso", icon: Users, roles: ["ADMIN"] },
    { href: "/admin/audit", label: "Auditoria", icon: ShieldCheck, roles: ["ADMIN"] },
    { href: "/backup", label: "Backup e recuperação", icon: Archive, roles: ["ADMIN"] }
  ] }
];

export const SIDEBAR_TOGGLE_EVENT = "sherlock:sidebar-toggle";

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setCollapsed(document.documentElement.dataset.sidebar === "collapsed"); }, []);
  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setMobileOpen((o) => !o);
    window.addEventListener(SIDEBAR_TOGGLE_EVENT, on);
    return () => window.removeEventListener(SIDEBAR_TOGGLE_EVENT, on);
  }, []);

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.dataset.sidebar = "collapsed"; else delete document.documentElement.dataset.sidebar;
    try { localStorage.setItem("sherlock-sidebar", next ? "collapsed" : "open"); } catch {}
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />}
      <aside
        className={clsx(
          "sb fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 -translate-x-full flex-col border-r border-white/10 bg-ink-900 text-gray-300 transition-transform duration-200",
          "md:sticky md:top-0 md:h-screen md:w-64 md:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <img src="/sherlock-logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="sb-label min-w-0 flex-1">
            <div className="font-display text-base font-semibold leading-tight text-white">Sherlock</div>
            <div className="text-[11px] text-gray-400">Perícia digital</div>
          </div>
          <button type="button" className="rounded p-1 text-gray-400 hover:text-white md:hidden" aria-label="Fechar menu" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>

        <nav aria-label="Navegação principal" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
            if (!items.length) return null;
            return (
              <div key={group.title}>
                <div className="sb-label px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-500">{group.title}</div>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} title={item.label} aria-current={active ? "page" : undefined}
                        className={clsx("sb-item group relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                          active ? "bg-brand-600/90 text-white shadow-inner" : "text-gray-400 hover:bg-white/10 hover:text-white")}>
                        {active && <span aria-hidden="true" className="absolute -left-3 top-2 bottom-2 w-1 rounded-r bg-brand-300" />}
                        <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" className="shrink-0" />
                        <span className="sb-label whitespace-nowrap">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={toggleCollapse} className="sb-item hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-gray-400 hover:bg-white/10 hover:text-white md:flex" aria-label={collapsed ? "Expandir menu" : "Recolher menu"}>
            {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}<span className="sb-label">Recolher menu</span>
          </button>
          <p className="sb-label mt-2 px-3 text-[11px] leading-snug text-gray-500">Uso restrito a peritos autorizados</p>
        </div>
      </aside>
    </>
  );
}
