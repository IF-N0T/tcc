"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FileSearch, FolderPlus, LayoutGrid, List, Search, X } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import DeleteCaseButton from "@/components/DeleteCaseButton";
import { normalize } from "@/lib/text";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/labels";

export type CaseRow = {
  id: string; code: string; name: string; description: string | null; status: string; priority: string;
  responsible: string; openedAt: string; updatedAt: string; evidences: number; findings: number; tasksDone: number; tasksTotal: number;
};

const PRIORITY_RANK: Record<string, number> = { CRITICA: 4, ALTA: 3, MEDIA: 2, BAIXA: 1 };
const SPINE: Record<string, string> = { CRITICA: "#ef4444", ALTA: "#f59e0b", MEDIA: "#3b82f6", BAIXA: "#6b7280" };
const SORTS = [["updated", "Atualização recente"], ["opened", "Abertura recente"], ["priority", "Prioridade"], ["name", "Nome (A–Z)"]] as const;

function timeAgo(iso: string) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora há pouco";
  const m = Math.round(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24); if (d < 30) return `há ${d} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function CasesBoard({ cases, canEdit }: { cases: CaseRow[]; canEdit: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>("updated");
  const [view, setView] = useState<"cards" | "table">("cards");
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => { try { const v = localStorage.getItem("sherlock-cases-view"); if (v === "table" || v === "cards") setView(v); } catch {} }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") { e.preventDefault(); search.current?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const changeView = (v: "cards" | "table") => { setView(v); try { localStorage.setItem("sherlock-cases-view", v); } catch {} };

  const owners = useMemo(() => [...new Set(cases.map((c) => c.responsible))].sort(), [cases]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUS_LABEL).map((s) => [s, cases.filter((c) => c.status === s).length])), [cases]);

  const list = useMemo(() => {
    const n = normalize(q);
    const filtered = cases.filter((c) =>
      (!status || c.status === status) && (!priority || c.priority === priority) && (!owner || c.responsible === owner) &&
      (!n || normalize(`${c.code} ${c.name} ${c.description ?? ""} ${c.responsible}`).includes(n)));
    return filtered.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name, "pt-BR")
      : sort === "priority" ? (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0)
      : sort === "opened" ? +new Date(b.openedAt) - +new Date(a.openedAt)
      : +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [cases, q, status, priority, owner, sort]);

  const hasFilter = !!(q || status || priority || owner);
  const clear = () => { setQ(""); setStatus(""); setPriority(""); setOwner(""); };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input ref={search} className="input !pl-9 !pr-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, código, responsável…  ( / )" aria-label="Buscar casos" />
          {q && <button type="button" aria-label="Limpar busca" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-800"><X size={14} /></button>}
        </div>
        <select className="input !w-auto" value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Prioridade">
          <option value="">Toda prioridade</option>{Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input !w-auto" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Responsável">
          <option value="">Todos os responsáveis</option>{owners.map((o) => <option key={o}>{o}</option>)}
        </select>
        <select className="input !w-auto" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar por">
          {SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="seg" role="group" aria-label="Modo de exibição">
          <button type="button" aria-pressed={view === "cards"} onClick={() => changeView("cards")} aria-label="Cartões"><LayoutGrid size={15} /></button>
          <button type="button" aria-pressed={view === "table"} onClick={() => changeView("table")} aria-label="Tabela"><List size={15} /></button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por situação">
        <button type="button" onClick={() => setStatus("")} aria-pressed={!status} className={`badge ${!status ? "badge-blue" : "badge-neutral"} cursor-pointer`}>Todos <b>{cases.length}</b></button>
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <button key={k} type="button" onClick={() => setStatus(status === k ? "" : k)} aria-pressed={status === k} className={`badge ${status === k ? "badge-blue" : "badge-neutral"} cursor-pointer`}>{v} <b>{counts[k]}</b></button>
        ))}
        <span className="ml-auto text-xs text-gray-500" aria-live="polite">{list.length} de {cases.length} caso(s)</span>
        {hasFilter && <button type="button" onClick={clear} className="text-xs text-brand-700 hover:underline">Limpar filtros</button>}
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <FileSearch size={34} className="text-gray-400" aria-hidden="true" />
          <p className="font-display text-lg text-gray-900">{cases.length ? "Nenhum caso com esses filtros" : "Nenhum caso cadastrado ainda"}</p>
          <p className="max-w-sm text-sm text-gray-500">{cases.length ? "Ajuste a busca ou limpe os filtros." : "Crie o primeiro caso para registrar evidências, hashes e cadeia de custódia."}</p>
          {cases.length ? <button type="button" onClick={clear} className="btn-secondary">Limpar filtros</button> : canEdit && <Link href="/cases/new" className="btn-primary"><FolderPlus size={16} aria-hidden="true" /> Criar caso</Link>}
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const pct = c.tasksTotal ? Math.round((c.tasksDone / c.tasksTotal) * 100) : 0;
            return (
              <Link key={c.id} href={`/cases/${c.id}`} className="card card-hover rise group relative flex flex-col gap-3 overflow-hidden p-5 pl-6" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: SPINE[c.priority] ?? "#888" }} />
                <div className="flex items-start justify-between gap-2">
                  <span className="tag-code">{c.code}</span>
                  <div className="flex items-center gap-1"><StatusBadge value={c.status} />{canEdit && <span className="opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"><DeleteCaseButton caseId={c.id} caseCode={c.code} /></span>}</div>
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold leading-snug text-gray-900">{c.name}</h2>
                  <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-gray-500">{c.description || "Sem descrição."}</p>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  {[["Evidências", c.evidences], ["Achados", c.findings], ["Tarefas", `${c.tasksDone}/${c.tasksTotal}`]].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg bg-gray-100 py-2"><dd className="text-base font-semibold text-gray-900">{v}</dd><dt className="text-[11px] text-gray-500">{k}</dt></div>
                  ))}
                </dl>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tarefas concluídas"><div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>
                <div className="mt-auto flex items-center gap-2 text-xs text-gray-500"><Avatar name={c.responsible} size={22} /><span className="truncate">{c.responsible}</span><span className="ml-auto shrink-0">{timeAgo(c.updatedAt)}</span></div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[900px]">
            <thead><tr><th>Código</th><th>Nome</th><th>Responsável</th><th>Situação</th><th>Prioridade</th><th>Evid.</th><th>Achados</th><th>Tarefas</th><th>Atualizado</th>{canEdit && <th className="text-right">Ações</th>}</tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/cases/${c.id}`} className="tag-code hover:underline">{c.code}</Link></td>
                  <td className="font-medium"><Link href={`/cases/${c.id}`} className="hover:text-brand-700">{c.name}</Link></td>
                  <td>{c.responsible}</td><td><StatusBadge value={c.status} /></td><td><StatusBadge value={c.priority} /></td>
                  <td>{c.evidences}</td><td>{c.findings}</td><td>{c.tasksDone}/{c.tasksTotal}</td><td className="whitespace-nowrap text-gray-500">{timeAgo(c.updatedAt)}</td>
                  {canEdit && <td className="text-right"><DeleteCaseButton caseId={c.id} caseCode={c.code} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
