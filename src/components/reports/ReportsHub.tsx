"use client";

import { useMemo, useState } from "react";
import { Archive, Download, Eye, FileSpreadsheet, FileText, Globe, Package, Printer } from "lucide-react";
import { useToast } from "@/components/ui/Providers";

type CaseOpt = { id: string; code: string; name: string };
type Version = { id: string; version: number; title: string; format: string; createdAt: string; case: { id: string; code: string; name: string }; author: { name: string } };

const FORMATS = [
  { id: "html-color", label: "HTML colorido", desc: "Relatório navegável com índice, filtro e botões. Imprime bem em cores.", icon: Globe, q: "format=html&mode=color", ext: "HTML", view: true },
  { id: "html-bw", label: "HTML preto e branco", desc: "Mesma estrutura em tons de cinza; severidade por texto e borda, não por cor.", icon: Printer, q: "format=html&mode=bw", ext: "HTML", view: true },
  { id: "xlsx", label: "Excel (.xlsx)", desc: "Uma aba por assunto, com filtro, painéis congelados e impressão A4.", icon: FileSpreadsheet, q: "format=xlsx", ext: "XLSX" },
  { id: "txt", label: "Bloco de Notas (.txt)", desc: "Texto puro em 80 colunas, UTF-8, quebras de linha do Windows.", icon: FileText, q: "format=txt", ext: "TXT" },
  { id: "zip", label: "Pacote completo (.zip)", desc: "Tudo acima + CSVs + arquivos para Autopsy/Timesketch + manifesto SHA-256.", icon: Package, q: "format=zip", ext: "ZIP" }
] as const;

export default function ReportsHub({ cases, versions, canEdit }: { cases: CaseOpt[]; versions: Version[]; canEdit: boolean }) {
  const toast = useToast();
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [doc, setDoc] = useState<"full" | "laudo">("full");
  const [archive, setArchive] = useState(true);
  const [busy, setBusy] = useState(false);
  const current = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  const url = (q: string, extra = "") => `/api/cases/${caseId}/export?${q}&doc=${doc}${extra}`;

  async function archiveVersion(label: string, fmt: string) {
    if (!archive || !canEdit || !current) return;
    setBusy(true);
    try {
      const save = await fetch(`/api/reports/${caseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${current.code} — ${label}`, format: fmt }) });
      if (save.ok) toast("Versão arquivada no histórico.", "ok");
    } finally { setBusy(false); }
  }

  if (cases.length === 0) return <div className="card px-6 py-16 text-center text-gray-500"><FileText className="mx-auto mb-2" size={30} aria-hidden="true" />Cadastre um caso para gerar relatórios.</div>;

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div><label className="label" htmlFor="rc">Caso</label>
          <select id="rc" className="input" value={caseId} onChange={(e) => setCaseId(e.target.value)}>{cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></div>
        <div><span className="label">Documento</span>
          <div className="seg" role="group" aria-label="Tipo de documento">
            <button type="button" aria-pressed={doc === "full"} onClick={() => setDoc("full")}>Pacote completo</button>
            <button type="button" aria-pressed={doc === "laudo"} onClick={() => setDoc("laudo")}>Minuta de laudo</button>
          </div></div>
        {canEdit && <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-gray-700"><input type="checkbox" className="h-4 w-4 accent-[rgb(var(--brand-500))]" checked={archive} onChange={(e) => setArchive(e.target.checked)} /> Arquivar versão no histórico</label>}
      </div>
      <p className="text-sm text-gray-500">
        {doc === "full" ? "Inclui pessoas, dispositivos, evidências com hashes e custódia, análises, achados, linha do tempo, relacionamentos, tarefas, diário, importações e as lacunas apontadas pelo Watson."
          : "Organiza os dados registrados na estrutura de um laudo e marca [PREENCHER] onde falta informação. Nada é inventado."}
      </p>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FORMATS.filter((f) => doc === "full" || f.id !== "zip").map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.id} className="card card-hover flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15 text-brand-500"><Icon size={20} aria-hidden="true" /></span><h3 className="font-display text-lg font-semibold text-gray-900">{f.label}</h3></div>
              <p className="flex-1 text-sm text-gray-500">{f.desc}</p>
              <div className="flex flex-wrap gap-2">
                {"view" in f && f.view && <a className="btn-secondary btn-sm" target="_blank" rel="noopener" href={url(f.q, "&inline=1")}><Eye size={14} aria-hidden="true" /> Visualizar</a>}
                {f.id === "html-bw" && <a className="btn-secondary btn-sm" target="_blank" rel="noopener" href={url(f.q, "&inline=1&print=1")}><Printer size={14} aria-hidden="true" /> Imprimir</a>}
                <a className="btn-primary btn-sm" href={url(f.q)} onClick={() => archiveVersion(f.label, f.ext === "HTML" ? "HTML" : f.ext)}><Download size={14} aria-hidden="true" /> Baixar</a>
              </div>
            </div>
          );
        })}
        <div className="card flex flex-col gap-2 p-5"><h3 className="font-display text-lg font-semibold text-gray-900">Tabelas em CSV</h3>
          <p className="text-sm text-gray-500">Uma tabela por arquivo (separador ponto e vírgula, UTF-8), para abrir no Excel ou importar em outras ferramentas.</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{[["evidencias", "Evidências"], ["hashes", "Hashes"], ["custodia", "Custódia"], ["analises", "Análises"], ["achados", "Achados"], ["linha-do-tempo", "Linha do tempo"]].map(([k, l]) => <a key={k} className="badge badge-neutral hover:border-brand-500" href={url(`format=csv&section=${k}`)}>{l}</a>)}</div></div>
      </div>

      <section className="card overflow-hidden" aria-labelledby="hist">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3"><Archive size={16} className="text-brand-500" aria-hidden="true" /><h2 id="hist" className="text-sm font-semibold text-gray-900">Histórico de versões arquivadas</h2>{busy && <span className="text-xs text-gray-500">arquivando…</span>}</div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[640px]"><thead><tr><th>Versão</th><th>Caso</th><th>Título</th><th>Formato</th><th>Autor</th><th>Data</th></tr></thead>
            <tbody>{versions.map((v) => <tr key={v.id}><td>v{v.version}</td><td><span className="tag-code">{v.case.code}</span></td><td>{v.title}</td><td><span className="badge badge-neutral">{v.format}</span></td><td>{v.author.name}</td><td className="whitespace-nowrap text-gray-500">{new Date(v.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td></tr>)}
              {versions.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-500">Nenhuma versão arquivada ainda.</td></tr>}</tbody></table>
        </div>
      </section>
    </div>
  );
}
