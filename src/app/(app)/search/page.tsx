"use client";

import { useState } from "react";
import Link from "next/link";

type CaseInfo = {
  id: string;
  code: string;
  name: string;
  openedAt: string;
  priority: string;
  status: string;
  responsible: { name: string };
};
type Result = { kind: string; code: string; label: string; caseId: string; caseCode: string; case: CaseInfo };

const PRIORITIES: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica"
};
const STATUSES: Record<string, string> = {
  EM_ANALISE: "Em análise",
  AGUARDANDO_EVIDENCIAS: "Aguardando evidências",
  EM_ELABORACAO_LAUDO: "Em elaboração do laudo",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado"
};

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length === 1) {
      setError("Digite pelo menos 2 caracteres no termo ou apague-o para pesquisar apenas com os filtros.");
      return;
    }
    if (!q.trim() && !priority && !status && !from && !to) {
      setError("Informe um termo ou selecione ao menos um filtro.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (priority) params.set("priority", priority);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível realizar a busca.");
      setResults(data.results ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível realizar a busca.");
    } finally {
      setLoading(false);
    }
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.caseCode] = acc[r.caseCode] ?? [];
    acc[r.caseCode].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Central de Investigação</h1>
        <p className="text-sm text-gray-500 mt-1">
          Encontre casos por palavras-chave, envolvidos ou peritos e refine por data, prioridade e situação.
        </p>
      </div>

      <form onSubmit={runSearch} className="card space-y-4 p-4">
        <input
          className="input"
          aria-label="Termo de busca"
          placeholder="Nome, perito, código, e-mail, IMEI ou palavra-chave..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-gray-600">
            Prioridade
            <select className="input mt-1" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Situação
            <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Aberto a partir de
            <input className="input mt-1" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Aberto até
            <input className="input mt-1" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={loading} type="submit">
            {loading ? "Buscando..." : "Buscar casos"}
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setQ("");
              setPriority("");
              setStatus("");
              setFrom("");
              setTo("");
              setResults([]);
              setSearched(false);
              setError(null);
            }}
          >
            Limpar filtros
          </button>
        </div>
      </form>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {searched && results.length === 0 && (
        <p className="text-sm text-gray-400">Nenhum caso ou registro encontrado com estes critérios.</p>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([caseCode, items]) => (
          <div key={caseCode} className="card p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-brand-700">{caseCode} — {items[0].case.name}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span>Aberto em {new Date(items[0].case.openedAt).toLocaleDateString("pt-BR")}</span>
                  <span>Prioridade: {PRIORITIES[items[0].case.priority] ?? items[0].case.priority}</span>
                  <span>Situação: {STATUSES[items[0].case.status] ?? items[0].case.status}</span>
                  <span>Perito: {items[0].case.responsible.name}</span>
                </div>
              </div>
              <Link href={`/cases/${items[0].caseId}`} className="text-brand-700 text-xs hover:underline">
                Abrir caso
              </Link>
            </div>
            <ul className="space-y-1">
              {items.map((r, idx) => (
                <li key={idx} className="text-sm flex items-center justify-between">
                  <span>
                    <span className="text-xs uppercase text-gray-400 mr-2">{r.kind}</span>
                    <span className="text-gray-500 mr-2">{r.code}</span>
                    {r.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
