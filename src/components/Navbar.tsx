"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import ThemeMenu from "@/components/ui/ThemeMenu";
import Avatar from "@/components/ui/Avatar";
import { OPEN_PALETTE_EVENT } from "@/components/ui/CommandPalette";
import { SIDEBAR_TOGGLE_EVENT } from "@/components/Sidebar";
import { ROLE_LABEL } from "@/lib/labels";

const CRUMBS: Record<string, string> = {
  dashboard: "Dashboard", cases: "Casos", new: "Novo caso", search: "Central de Investigação", analyses: "Análises forenses",
  reports: "Laudos e relatórios", assistant: "Assistente Watson", library: "Biblioteca Watson", integrations: "Integrações",
  backup: "Backup e recuperação", admin: "Administração", users: "Contas e acesso", audit: "Auditoria"
};

export default function Navbar({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  useEffect(() => {
    if (!menu) return;
    const on = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, [menu]);

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((seg, i) => ({ label: CRUMBS[seg] ?? "Detalhe", href: "/" + segments.slice(0, i + 1).join("/") }));

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="no-print sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-gray-200 bg-white/85 px-4 py-3 backdrop-blur md:px-6">
      <button type="button" className="btn-secondary !px-2.5 md:hidden" aria-label="Abrir menu" onClick={() => window.dispatchEvent(new Event(SIDEBAR_TOGGLE_EVENT))}><Menu size={18} /></button>

      <nav aria-label="Você está em" className="hidden min-w-0 items-center gap-1.5 text-sm text-gray-500 md:flex">
        {crumbs.map((c, i) => (
          <span key={c.href} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {i === crumbs.length - 1 ? <span className="truncate font-medium text-gray-800">{c.label}</span> : <Link href={c.href} className="truncate hover:text-gray-800">{c.label}</Link>}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
          className="btn-secondary !justify-start gap-2 !px-3 text-gray-500 sm:min-w-[210px]" aria-label="Busca rápida">
          <Search size={15} aria-hidden="true" /><span className="hidden flex-1 text-left text-xs sm:inline">Buscar…</span>
          <span className="kbd hidden sm:inline-flex">{isMac ? "⌘" : "Ctrl"}+K</span>
        </button>
        <ThemeMenu />
        <div className="relative" ref={box}>
          <button type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-gray-100">
            <Avatar name={name} size={34} online />
            <span className="hidden text-left leading-tight lg:block"><span className="block text-sm font-medium text-gray-800">{name}</span><span className="block text-[11px] text-gray-500">{ROLE_LABEL[role] ?? role}</span></span>
          </button>
          {menu && (
            <div role="menu" className="card rise absolute right-0 z-50 mt-2 w-60 p-2">
              <div className="px-3 py-2"><div className="text-sm font-medium text-gray-900">{name}</div><div className="text-xs text-gray-500">{ROLE_LABEL[role] ?? role}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-green-500"><span className="dot dot-online" aria-hidden="true" /> Online agora</div></div>
              <button role="menuitem" type="button" onClick={handleLogout} className="btn-ghost w-full !justify-start"><LogOut size={15} aria-hidden="true" /> Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
