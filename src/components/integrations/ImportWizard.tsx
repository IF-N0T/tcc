"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, FileUp, RefreshCw, TriangleAlert, Upload } from "lucide-react";
import { useToast } from "@/components/ui/Providers";

type CaseOpt = { id: string; code: string; name: string; evidences: { id: string; code: string; description: string }[] };
type Preview = {
  detected: string; label: string; tool: string; rowCount: number; truncated: boolean; columns: string[]; mapping: Record<string, string>;
  unmapped: string[]; warnings: string[]; summary: string; sample: Record<string, string>[]; singleHash: string | null;
};

const SOURCES = [
  ["auto", "Detectar automaticamente"], ["autopsy-table", "Autopsy — tabela de resultados (CSV/Excel)"], ["imagej-results", "ImageJ / Fiji — tabela Results (CSV)"],
  ["hash-list", "Lista de hashes (sha256sum, md5sum, PowerShell)"], ["sleuthkit-body", "The Sleuth Kit — body file"], ["generic-table", "Tabela genérica (CSV/Excel)"]
] as const;
const MAX = 8 * 1024 * 1024;

function toBase64(buf: ArrayBuffer) {
  let bin = ""; const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export default function ImportWizard({ cases, canEdit }: { cases: CaseOpt[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [source, setSource] = useState<(typeof SOURCES)[number][0]>("auto");
  const [file, setFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<{ encoding: "text" | "base64"; content: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [asHash, setAsHash] = useState(false);
  const [busy, setBusy] = useState<"" | "read" | "commit">("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState(false);

  const evidences = cases.find((c) => c.id === caseId)?.evidences ?? [];

  async function request(mode: "preview" | "commit", f = file, p = payload, src = source) {
    const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, caseId, evidenceId: evidenceId || undefined, source: src, filename: f!.name, ...p, registerAsEvidenceHash: asHash || undefined }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Falha na importação.");
    return data;
  }

  async function pick(f: File | null) {
    setError(""); setPreview(null);
    if (!f) return;
    if (f.size > MAX) { setError("O arquivo excede 8 MB."); return; }
    setFile(f); setBusy("read");
    try {
      const isXlsx = /\.xlsx$/i.test(f.name);
      const p = isXlsx ? { encoding: "base64" as const, content: toBase64(await f.arrayBuffer()) } : { encoding: "text" as const, content: await f.text() };
      setPayload(p);
      const data = await request("preview", f, p);
      setPreview(data);
      if (source === "auto") { /* mantém o detectado apenas para exibição */ }
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível ler o arquivo."); }
    finally { setBusy(""); }
  }

  async function changeSource(v: (typeof SOURCES)[number][0]) {
    setSource(v);
    if (file && payload) { setBusy("read"); setError(""); try { setPreview(await request("preview", file, payload, v)); } catch (e) { setPreview(null); setError(e instanceof Error ? e.message : "Erro."); } finally { setBusy(""); } }
  }

  async function commit() {
    if (!caseId || !evidenceId) { setError("Escolha o caso e a evidência a que o arquivo se refere."); return; }
    setBusy("commit"); setError("");
    try {
      const data = await request("commit", file, payload, preview ? (preview.detected as typeof source) : source);
      toast(`${data.imported} linha(s) importada(s) como ${data.analysisCode}.${data.hashRegistered ? ` Hash registrado (${data.hashRegistered}).` : ""}`, "ok");
      setFile(null); setPayload(null); setPreview(null); setAsHash(false); if (input.current) input.current.value = "";
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao importar."); }
    finally { setBusy(""); }
  }

  if (!canEdit) return <div className="card p-6 text-sm text-gray-500">Seu perfil é somente leitura; peça a um perito ou administrador para importar arquivos.</div>;

  return (
    <div className="card space-y-5 p-5">
      <ol className="grid gap-4 md:grid-cols-3">
        <li><label className="label" htmlFor="ic">1. Caso</label>
          <select id="ic" className="input" value={caseId} onChange={(e) => { setCaseId(e.target.value); setEvidenceId(""); }}><option value="">Selecione…</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></li>
        <li><label className="label" htmlFor="ie">2. Evidência de origem</label>
          <select id="ie" className="input" value={evidenceId} onChange={(e) => setEvidenceId(e.target.value)} disabled={!caseId}><option value="">{caseId ? "Selecione…" : "Escolha o caso primeiro"}</option>{evidences.map((e) => <option key={e.id} value={e.id}>{e.code} — {e.description}</option>)}</select></li>
        <li><label className="label" htmlFor="is">3. Formato do arquivo</label>
          <select id="is" className="input" value={source} onChange={(e) => changeSource(e.target.value as typeof source)}>{SOURCES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></li>
      </ol>

      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0] ?? null); }}
        className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-brand-500 bg-brand-500/10" : "border-gray-300"}`}>
        {busy === "read" ? <RefreshCw className="animate-spin text-brand-500" aria-hidden="true" /> : <Upload className="text-brand-500" aria-hidden="true" />}
        <p className="text-sm text-gray-700">{file ? <b>{file.name}</b> : "Arraste o arquivo aqui"} <span className="text-gray-500">ou</span></p>
        <button type="button" className="btn-secondary" onClick={() => input.current?.click()}><FileUp size={15} aria-hidden="true" /> Escolher arquivo</button>
        <input ref={input} type="file" className="sr-only" accept=".csv,.txt,.xlsx,.sha256,.md5,.body,.tsv" onChange={(e) => pick(e.target.files?.[0] ?? null)} aria-label="Arquivo para importar" />
        <p className="text-xs text-gray-500">CSV, TXT ou XLSX · até 8 MB · até 20.000 linhas por importação</p>
      </div>

      {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500"><TriangleAlert size={16} className="mt-0.5 shrink-0" />{error}</p>}

      {preview && (
        <div className="space-y-4 rise">
          <div className="flex flex-wrap items-center gap-2"><CircleCheck size={18} className="text-green-500" aria-hidden="true" /><b className="text-sm text-gray-900">Prévia: {preview.label}</b><span className="badge badge-neutral">{preview.rowCount} linha(s)</span></div>
          {preview.warnings.map((w, i) => <p key={i} className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-sm text-gray-700"><TriangleAlert size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />{w}</p>)}
          {Object.keys(preview.mapping).length > 0 && <div className="text-sm"><span className="font-medium text-gray-900">Colunas reconhecidas: </span>{Object.entries(preview.mapping).map(([k, v]) => <span key={k} className="tag-code mr-1.5">{k} → {v}</span>)}
            {preview.unmapped.length > 0 && <p className="mt-1 text-xs text-gray-500">Não reconhecidas (guardadas como informação extra): {preview.unmapped.join(", ")}</p>}</div>}
          <div className="overflow-x-auto rounded-lg border border-gray-200"><table className="table-base"><thead><tr>{preview.sample[0] && Object.keys(preview.sample[0]).map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{preview.sample.map((r, i) => <tr key={i}>{Object.values(r).map((v, j) => <td key={j} className="max-w-[260px] truncate" title={v}>{v}</td>)}</tr>)}</tbody></table></div>
          <pre className="whitespace-pre-wrap rounded-lg bg-gray-100 p-3 text-xs text-gray-700">{preview.summary}</pre>
          {preview.singleHash && <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[rgb(var(--brand-500))]" checked={asHash} onChange={(e) => setAsHash(e.target.checked)} /> Este arquivo contém o hash da própria evidência: registrar também como hash de integridade da evidência ({preview.singleHash.slice(0, 16)}…).</label>}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
            <button type="button" className="btn-primary" disabled={busy === "commit" || !caseId || !evidenceId} onClick={commit}>{busy === "commit" ? "Importando…" : `Importar ${preview.rowCount} linha(s)`}</button>
            <span className="text-xs text-gray-500">Cria uma análise “Importação de {preview.tool}” sem conclusão. Nada é interpretado.</span>
          </div>
        </div>
      )}
    </div>
  );
}
