"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, BookOpen, FileText, FolderKanban, FolderPlus, LayoutDashboard, Moon, Plug, Search, Sun, Workflow, type LucideIcon } from "lucide-react";
import { normalize } from "@/lib/text";
import { readPrefs, savePrefs } from "@/lib/prefs";

type Item = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void };
type CaseLite = { id: string; code: string; name: string };

export const OPEN_PALETTE_EVENT = "sherlock:palette";

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cases, setCases] = useState<CaseLite[] | null>(null);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      else if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey); window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener(OPEN_PALETTE_EVENT, onOpen); };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQ(""); setIndex(0);
    setTimeout(() => input.current?.focus(), 20);
    if (!cases) fetch("/api/cases").then((r) => (r.ok ? r.json() : [])).then((d: CaseLite[]) => setCases(d)).catch(() => setCases([]));
  }, [open, cases]);

  const go = (href: string) => () => { setOpen(false); router.push(href); };
  const items: Item[] = useMemo(() => {
    const base: Item[] = [
      { id: "dash", label: "Dashboard", icon: LayoutDashboard, run: go("/dashboard") },
      { id: "cases", label: "Casos", icon: FolderKanban, run: go("/cases") },
      { id: "new", label: "Novo caso", hint: "Criar", icon: FolderPlus, run: go("/cases/new") },
      { id: "search", label: "Central de Investigação", icon: Search, run: go("/search") },
      { id: "analyses", label: "Análises forenses", icon: Workflow, run: go("/analyses") },
      { id: "watson", label: "Assistente Watson", hint: "IA investigativa", icon: Bot, run: go("/assistant") },
      { id: "library", label: "Biblioteca Watson", icon: BookOpen, run: go("/library") },
      { id: "reports", label: "Laudos e relatórios", icon: FileText, run: go("/reports") },
      { id: "integr", label: "Integrações (Autopsy, ImageJ…)", icon: Plug, run: go("/integrations") },
      { id: "theme", label: "Alternar claro/escuro", hint: "Aparência", icon: Sun, run: () => { const p = readPrefs(); savePrefs({ ...p, mode: document.documentElement.classList.contains("dark") ? "light" : "dark" }); setOpen(false); } }
    ];
    const caseItems: Item[] = (cases ?? []).map((c) => ({ id: c.id, label: `${c.code} — ${c.name}`, hint: "Caso", icon: FolderKanban, run: go(`/cases/${c.id}`) }));
    const n = normalize(q);
    return [...base, ...caseItems].filter((i) => !n || normalize(`${i.label} ${i.hint ?? ""}`).includes(n)).slice(0, 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cases]);

  useEffect(() => setIndex(0), [q]);
  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-[85] flex items-start justify-center bg-black/55 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Busca rápida" className="card rise w-full max-w-xl overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 px-4">
          <Search size={18} className="text-gray-500" aria-hidden="true" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ir para página ou caso…" aria-label="Buscar"
            className="h-12 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") items[index]?.run();
            }} />
          <span className="kbd">Esc</span>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <li key={it.id} role="option" aria-selected={i === index}>
                <button type="button" onMouseEnter={() => setIndex(i)} onClick={it.run}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${i === index ? "bg-brand-500/15 text-gray-900" : "text-gray-700"}`}>
                  <Icon size={16} aria-hidden="true" className="shrink-0 text-brand-500" />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.hint && <span className="text-xs text-gray-500">{it.hint}</span>}
                </button>
              </li>
            );
          })}
          {!items.length && <li className="px-3 py-6 text-center text-sm text-gray-500">Nada encontrado.</li>}
        </ul>
        <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-2 text-[11px] text-gray-500"><span><span className="kbd">↑</span> <span className="kbd">↓</span> navegar</span><span><span className="kbd">Enter</span> abrir</span><span className="ml-auto"><Moon size={11} className="inline" /> dica: Ctrl+K em qualquer tela</span></div>
      </div>
    </div>
  );
}
