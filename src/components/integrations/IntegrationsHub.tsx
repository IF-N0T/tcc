"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, Plug, Plus, Trash2, Wrench } from "lucide-react";
import ImportWizard from "./ImportWizard";
import { useConfirm, useToast } from "@/components/ui/Providers";

type CaseOpt = { id: string; code: string; name: string; evidences: { id: string; code: string; description: string }[] };
type Tool = { id: string; name: string; vendor: string | null; version: string | null; analysesCount: number };

const TABS = [["import", "Importar de ferramentas"], ["export", "Exportar para ferramentas"], ["tools", "Ferramentas cadastradas"]] as const;

const MATRIX = [
  { tool: "Autopsy", imp: "CSV exportado das tabelas de resultados, ou relatório em Excel (.xlsx).", exp: "palavras-chave.txt (um termo por linha) e evidencias-hashes.csv.", tip: "Importe vinculando à evidência que contém a imagem examinada." },
  { tool: "ImageJ / Fiji", imp: "Tabela Results salva como CSV. O sistema resume colunas numéricas (n, mín., máx., média).", exp: "evidencias.csv para nomear os arquivos de imagem pelos códigos.", tip: "Calibre a escala antes de medir; o Sherlock não converte unidades." },
  { tool: "The Sleuth Kit", imp: "Body file (fls -m). Cada linha vira um item com datas MACB.", exp: "—", tip: "Útil para comparar hashes e consultar arquivos por nome." },
  { tool: "FTK Imager · sha256sum · PowerShell", imp: "Listas “hash  arquivo” ou CSV com coluna de hash (Get-FileHash).", exp: "sha256sum-evidencias.txt, sha1sum-…, md5sum-… (formato sha256sum).", tip: "Hashes importados são comparados com outros casos pelo Watson." },
  { tool: "Timesketch", imp: "—", exp: "timeline-timesketch.csv (datetime, timestamp_desc, message).", tip: "Confira o formato exigido pela versão que você usa." },
  { tool: "Excel · Bloco de Notas", imp: "Tabela genérica (CSV/XLSX) com colunas reconhecidas por nome.", exp: "relatório .xlsx (uma aba por assunto) e .txt (80 colunas).", tip: "Disponíveis em Laudos e relatórios." }
];

export default function IntegrationsHub({ cases, tools, canEdit }: { cases: CaseOpt[]; tools: Tool[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("import");
  const [exportCase, setExportCase] = useState("");
  const [saving, setSaving] = useState(false);
  const [jsonCase, setJsonCase] = useState("");
  const [jsonTool, setJsonTool] = useState("");

  async function addTool(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; const v = new FormData(form);
    setSaving(true);
    const res = await fetch("/api/tools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: v.get("name"), vendor: v.get("vendor"), version: v.get("version") }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { toast(data.error ?? "Não foi possível cadastrar.", "error"); return; }
    form.reset(); toast(`Ferramenta “${data.name}” cadastrada.`, "ok"); router.refresh();
  }

  async function removeTool(t: Tool) {
    if (!(await confirm({ title: `Excluir “${t.name}”?`, message: t.analysesCount ? "Existem análises usando esta ferramenta; a exclusão pode ser recusada." : undefined, confirmLabel: "Excluir", danger: true }))) return;
    const res = await fetch(`/api/tools?id=${encodeURIComponent(t.id)}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error ?? "Não foi possível excluir.", "error"); return; }
    toast("Ferramenta excluída.", "ok"); router.refresh();
  }

  async function importJson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = new FormData(e.currentTarget).get("json-file");
    if (!jsonCase || !jsonTool) { toast("Escolha o caso e a ferramenta.", "warn"); return; }
    if (!(file instanceof File) || !file.size) { toast("Selecione um arquivo JSON.", "warn"); return; }
    if (file.size > 2 * 1024 * 1024) { toast("O arquivo excede 2 MB.", "error"); return; }
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : (parsed as { rows?: unknown }).rows;
      if (!Array.isArray(rows)) throw new Error("O JSON deve ser uma lista de análises ou um objeto com a propriedade “rows”.");
      const res = await fetch("/api/tools/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolId: jsonTool, caseId: jsonCase, rows }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Não foi possível importar.");
      toast(`${data.imported} análise(s) importada(s).`, "ok"); (e.target as HTMLFormElement).reset(); router.refresh();
    } catch (err) { toast(err instanceof Error ? err.message : "Arquivo inválido.", "error"); }
  }

  return (
    <div className="space-y-6">
      <div className="tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}</button>)}</div>

      {tab === "import" && (
        <div className="space-y-6 rise">
          <ImportWizard cases={cases} canEdit={canEdit} />
          {canEdit && (
            <details className="card p-5">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">Importar análises em JSON (formato Sherlock)</summary>
              <form onSubmit={importJson} className="mt-4 grid gap-3 md:grid-cols-4 md:items-end">
                <div><label className="label" htmlFor="jc">Caso</label><select id="jc" className="input" value={jsonCase} onChange={(e) => setJsonCase(e.target.value)}><option value="">Selecione…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}</select></div>
                <div><label className="label" htmlFor="jt">Ferramenta</label><select id="jt" className="input" value={jsonTool} onChange={(e) => setJsonTool(e.target.value)}><option value="">Selecione…</option>{tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div><label className="label" htmlFor="jf">Arquivo .json</label><input id="jf" name="json-file" type="file" accept="application/json,.json" className="input" /></div>
                <button className="btn-secondary"><FileUp size={15} aria-hidden="true" /> Importar</button>
              </form>
            </details>
          )}
        </div>
      )}

      {tab === "export" && (
        <div className="space-y-6 rise">
          <div className="card flex flex-wrap items-end gap-3 p-5">
            <div className="min-w-[260px] flex-1"><label className="label" htmlFor="ec">Caso</label><select id="ec" className="input" value={exportCase} onChange={(e) => setExportCase(e.target.value)}><option value="">Selecione…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></div>
            <a className={`btn-primary ${exportCase ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!exportCase} href={exportCase ? `/api/cases/${exportCase}/export?format=zip` : undefined}><Download size={15} aria-hidden="true" /> Pacote completo (.zip)</a>
            <a className={`btn-secondary ${exportCase ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!exportCase} href={exportCase ? `/api/cases/${exportCase}/export?format=csv&section=hashes` : undefined}>Hashes (.csv)</a>
            <a className={`btn-secondary ${exportCase ? "" : "pointer-events-none opacity-50"}`} aria-disabled={!exportCase} href={exportCase ? `/api/cases/${exportCase}/export?format=csv&section=linha-do-tempo` : undefined}>Linha do tempo (.csv)</a>
          </div>
          <p className="text-sm text-gray-500">O pacote traz a pasta <code className="font-mono">interop/</code> com os arquivos abaixo e um <code className="font-mono">LEIA-ME.txt</code>. Os formatos seguem convenções públicas das ferramentas, mas não foram testados contra cada versão: valide com um caso de teste.</p>
        </div>
      )}

      {tab !== "tools" && (
        <section aria-labelledby="matrix" className="rise">
          <h2 id="matrix" className="font-display mb-3 text-lg font-semibold text-gray-900">Compatibilidade</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MATRIX.map((m) => (
              <article key={m.tool} className="card space-y-2 p-4 text-sm">
                <h3 className="flex items-center gap-2 font-semibold text-gray-900"><Plug size={15} className="text-brand-500" aria-hidden="true" />{m.tool}</h3>
                <p><span className="badge badge-green mr-1.5">Importa</span><span className="text-gray-600">{m.imp}</span></p>
                <p><span className="badge badge-blue mr-1.5">Exporta</span><span className="text-gray-600">{m.exp}</span></p>
                <p className="text-xs text-gray-500">{m.tip}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "tools" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px] rise">
          <div className="card overflow-x-auto"><table className="table-base min-w-[520px]"><thead><tr><th>Ferramenta</th><th>Fabricante</th><th>Versão</th><th>Análises</th>{canEdit && <th />}</tr></thead>
            <tbody>{tools.map((t) => <tr key={t.id}><td className="font-medium">{t.name}</td><td>{t.vendor ?? "—"}</td><td>{t.version ?? "—"}</td><td>{t.analysesCount}</td>
              {canEdit && <td className="text-right"><button type="button" className="btn-ghost btn-sm !text-red-500" onClick={() => removeTool(t)} aria-label={`Excluir ${t.name}`}><Trash2 size={14} /></button></td>}</tr>)}
              {tools.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500">Nenhuma ferramenta cadastrada.</td></tr>}</tbody></table></div>
          {canEdit && (
            <form onSubmit={addTool} className="card h-fit space-y-3 p-5">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900"><Wrench size={16} aria-hidden="true" /> Nova ferramenta</h3>
              <div><label className="label" htmlFor="tn">Nome</label><input id="tn" name="name" className="input" required minLength={2} placeholder="Autopsy" /></div>
              <div><label className="label" htmlFor="tv">Fabricante</label><input id="tv" name="vendor" className="input" /></div>
              <div><label className="label" htmlFor="tvv">Versão</label><input id="tvv" name="version" className="input" placeholder="4.21.0" /></div>
              <button className="btn-primary w-full" disabled={saving}><Plus size={15} aria-hidden="true" /> Cadastrar</button>
              <p className="text-xs text-gray-500">Registrar a versão ajuda a reprodução da análise.</p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
