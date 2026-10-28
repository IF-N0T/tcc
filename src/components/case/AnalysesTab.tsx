"use client";

import { useState } from "react";
import { ChevronDown, FileSpreadsheet, Plug } from "lucide-react";
import Link from "next/link";

type Item = { id: string; name: string; path: string | null; size: string | null; md5: string | null; sha1: string | null; sha256: string | null; modifiedAt: string | null };

function ImportRow({ imp }: { imp: any }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(query = q, offset = 0) {
    setLoading(true);
    const res = await fetch(`/api/imports/${imp.id}/items?offset=${offset}&q=${encodeURIComponent(query)}`);
    const data = await res.json().catch(() => ({ items: [], total: 0 }));
    setItems(offset ? [...(items ?? []), ...data.items] : data.items); setTotal(data.total); setLoading(false);
  }

  return (
    <li className="card">
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" aria-expanded={open} onClick={() => { setOpen(!open); if (!open && !items) load(); }}>
        <FileSpreadsheet size={18} className="shrink-0 text-brand-500" aria-hidden="true" />
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-gray-900">{imp.filename}</span>
          <span className="text-xs text-gray-500">{imp.tool?.name ?? imp.source} · {imp.rowCount} linha(s) · {new Date(imp.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span></span>
        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 p-4">
          {imp.summary && <pre className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-xs text-gray-700">{imp.summary}</pre>}
          <div className="flex gap-2"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(q, 0)} placeholder="Filtrar por nome, caminho ou hash exato…" aria-label="Filtrar itens importados" /><button type="button" className="btn-secondary" onClick={() => load(q, 0)}>Filtrar</button></div>
          <div className="max-h-96 overflow-auto rounded-lg border border-gray-200">
            <table className="table-base"><thead><tr><th>Nome</th><th>Caminho</th><th>Tamanho</th><th>Hash</th></tr></thead>
              <tbody>{(items ?? []).map((it) => <tr key={it.id}><td className="break-all">{it.name}</td><td className="break-all text-xs text-gray-500">{it.path ?? ""}</td><td>{it.size ?? ""}</td><td className="break-all font-mono text-[11px]">{it.sha256 ?? it.sha1 ?? it.md5 ?? ""}</td></tr>)}
                {items && items.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-500">Nenhum item.</td></tr>}</tbody></table>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500"><span>Mostrando {items?.length ?? 0} de {total}</span>{items && items.length < total && <button type="button" className="btn-secondary btn-sm" disabled={loading} onClick={() => load(q, items.length)}>Carregar mais</button>}</div>
        </div>
      )}
    </li>
  );
}

export default function AnalysesTab({ kase, canEdit }: { kase: any; canEdit: boolean }) {
  const codeOf = (id: string) => kase.evidences.find((e: any) => e.id === id)?.code ?? "—";
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-gray-900">Análises registradas ({kase.analyses.length})</h2>
          <Link href="/analyses" className="text-xs text-brand-700 hover:underline">Registrar nova análise</Link></div>
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[760px]"><thead><tr><th>Código</th><th>Evidência</th><th>Tipo</th><th>Ferramenta</th><th>Responsável</th><th>Data</th><th>Conclusão</th></tr></thead>
            <tbody>{kase.analyses.map((a: any) => (
              <tr key={a.id}><td><span className="tag-code">{a.code}</span></td><td><span className="tag-code">{codeOf(a.evidenceId)}</span></td><td>{a.type}</td><td>{a.tool ? `${a.tool.name}${a.tool.version ? " " + a.tool.version : ""}` : <span className="badge badge-amber">não informada</span>}</td>
                <td>{a.performedBy.name}</td><td className="whitespace-nowrap">{new Date(a.performedAt).toLocaleDateString("pt-BR")}</td><td className="max-w-xs truncate">{a.conclusion ?? <span className="text-gray-500">—</span>}</td></tr>
            ))}{kase.analyses.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-500">Nenhuma análise registrada.</td></tr>}</tbody></table>
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-gray-900">Importações de ferramentas ({kase.toolImports.length})</h2>
          {canEdit && <Link href="/integrations" className="btn-secondary btn-sm"><Plug size={13} aria-hidden="true" /> Importar arquivo</Link>}</div>
        <ul className="space-y-3">{kase.toolImports.map((i: any) => <ImportRow key={i.id} imp={i} />)}
          {kase.toolImports.length === 0 && <li className="card px-6 py-10 text-center text-sm text-gray-500">Nada importado ainda. Use Integrações para trazer resultados do Autopsy, ImageJ ou listas de hash.</li>}</ul>
      </section>
    </div>
  );
}
