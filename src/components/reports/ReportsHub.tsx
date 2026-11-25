"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Download, Eye, FileSpreadsheet, FileText, FileUp, Globe, LoaderCircle, Package, Paperclip, Printer } from "lucide-react";
import { useToast } from "@/components/ui/Providers";

type CaseOpt = { id: string; code: string; name: string };
type Version = { id: string; version: number; title: string; format: string; createdAt: string; case: { id: string; code: string; name: string }; author: { name: string } };
type Attachment = { id: string; filename: string; mimeType: string; fileSize: number; sha256: string; description: string | null; createdAt: string; uploadedBy: { name: string } };

const FORMATS = [
  { id: "html-color", label: "HTML colorido", desc: "Relatório navegável com índice, filtro e botões. Imprime bem em cores.", icon: Globe, q: "format=html&mode=color", ext: "HTML", view: true },
  { id: "html-bw", label: "HTML preto e branco", desc: "Mesma estrutura em tons de cinza; severidade por texto e borda, não por cor.", icon: Printer, q: "format=html&mode=bw", ext: "HTML", view: true },
  { id: "xlsx", label: "Excel (.xlsx)", desc: "Uma aba por assunto, com filtro, painéis congelados e impressão A4.", icon: FileSpreadsheet, q: "format=xlsx", ext: "XLSX" },
  { id: "txt", label: "Bloco de Notas (.txt)", desc: "Texto puro em 80 colunas, UTF-8, quebras de linha do Windows.", icon: FileText, q: "format=txt", ext: "TXT" },
  { id: "zip", label: "Pacote completo (.zip)", desc: "Tudo acima + CSVs + arquivos para Autopsy/Timesketch + manifesto SHA-256.", icon: Package, q: "format=zip", ext: "ZIP" }
] as const;

export default function ReportsHub({ cases, versions, canEdit }: { cases: CaseOpt[]; versions: Version[]; canEdit: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [doc, setDoc] = useState<"full" | "laudo">("full");
  const [archive, setArchive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const current = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  const url = (q: string, extra = "") => `/api/cases/${caseId}/export?${q}&doc=${doc}${extra}`;

  useEffect(() => {
    if (!caseId) {
      setAttachments([]);
      return;
    }
    let cancelled = false;
    setAttachments([]);
    setAttachmentsLoading(true);
    setAttachmentError("");
    fetch(`/api/reports/${caseId}/attachments`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? "Não foi possível carregar os anexos.");
        if (!cancelled) setAttachments(data);
      })
      .catch((error) => {
        if (!cancelled) setAttachmentError(error instanceof Error ? error.message : "Não foi possível carregar os anexos.");
      })
      .finally(() => {
        if (!cancelled) setAttachmentsLoading(false);
      });
    return () => { cancelled = true; };
  }, [caseId]);

  async function archiveVersion(label: string, fmt: string) {
    if (!archive || !canEdit || !current) return;
    setBusy(true);
    try {
      const save = await fetch(`/api/reports/${caseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `${current.code} — ${label}`, format: fmt }) });
      const data = await save.json().catch(() => ({}));
      if (!save.ok) throw new Error(data.error ?? "Não foi possível arquivar a versão.");
      toast("Versão arquivada no histórico.", "ok");
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Não foi possível arquivar a versão.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function uploadAttachment() {
    if (!selectedFile || !caseId) return;
    setUploading(true);
    setAttachmentError("");
    try {
      const form = new FormData();
      form.set("file", selectedFile);
      form.set("description", description);
      const response = await fetch(`/api/reports/${caseId}/attachments`, { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Não foi possível anexar o arquivo.");
      setAttachments((items) => [data, ...items]);
      setSelectedFile(null);
      setDescription("");
      if (fileInput.current) fileInput.current.value = "";
      toast("Documento anexado ao caso com hash SHA-256.", "ok");
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : "Não foi possível anexar o arquivo.");
    } finally {
      setUploading(false);
    }
  }

  if (cases.length === 0) return <div className="card px-6 py-16 text-center text-gray-500"><FileText className="mx-auto mb-2" size={30} aria-hidden="true" />Cadastre um caso para gerar relatórios.</div>;

  return (
    <div className="space-y-6">
      <div className="card grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
        <div><label className="label" htmlFor="rc">Caso</label>
          <select id="rc" className="input" value={caseId} disabled={uploading} onChange={(e) => { setCaseId(e.target.value); setSelectedFile(null); setDescription(""); if (fileInput.current) fileInput.current.value = ""; }}>{cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></div>
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
                <a className="btn-primary btn-sm" href={url(f.q)} onClick={(event) => {
                  if (!archive || !canEdit || !current) return;
                  event.preventDefault();
                  void archiveVersion(f.label, f.ext === "HTML" ? "HTML" : f.ext).then(() => window.location.assign(url(f.q)));
                }}><Download size={14} aria-hidden="true" /> Baixar</a>
              </div>
            </div>
          );
        })}
        <div className="card flex flex-col gap-2 p-5"><h3 className="font-display text-lg font-semibold text-gray-900">Tabelas em CSV</h3>
          <p className="text-sm text-gray-500">Uma tabela por arquivo (separador ponto e vírgula, UTF-8), para abrir no Excel ou importar em outras ferramentas.</p>
          <div className="mt-1 flex flex-wrap gap-1.5">{[["evidencias", "Evidências"], ["hashes", "Hashes"], ["custodia", "Custódia"], ["analises", "Análises"], ["achados", "Achados"], ["linha-do-tempo", "Linha do tempo"]].map(([k, l]) => <a key={k} className="badge badge-neutral hover:border-brand-500" href={url(`format=csv&section=${k}`)}>{l}</a>)}</div></div>
      </div>

      <section className="card space-y-4 p-5" aria-labelledby="attachments-title">
        <div className="flex items-start gap-3">
          <Paperclip size={19} className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
          <div>
            <h2 id="attachments-title" className="font-display text-lg font-semibold text-gray-900">Documentos anexados ao caso</h2>
            <p className="mt-1 text-sm text-gray-500">Anexe PDF, PNG ou JPEG de até 10 MB. O arquivo original é guardado no banco do projeto e recebe um hash SHA-256; não há OCR nem extração de texto.</p>
          </div>
        </div>

        {canEdit && <div className="grid gap-3 rounded-lg border border-gray-200 p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="label" htmlFor="report-attachment">Arquivo</label>
            <input ref={fileInput} id="report-attachment" className="input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" disabled={uploading} onChange={(event) => { setSelectedFile(event.target.files?.[0] ?? null); setAttachmentError(""); }} />
            {selectedFile && <p className="mt-1 text-xs text-gray-500">{selectedFile.name} · {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>}
          </div>
          <div>
            <label className="label" htmlFor="attachment-description">Descrição (opcional)</label>
            <input id="attachment-description" className="input" maxLength={2000} value={description} disabled={uploading} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: laudo assinado ou documento de referência" />
          </div>
          <button type="button" className="btn-primary" disabled={!selectedFile || uploading} onClick={uploadAttachment}>
            {uploading ? <LoaderCircle size={15} className="animate-spin" aria-hidden="true" /> : <FileUp size={15} aria-hidden="true" />}
            {uploading ? "Enviando…" : "Anexar"}
          </button>
        </div>}

        {!canEdit && <p className="text-sm text-gray-500">Seu perfil pode consultar e baixar anexos; somente peritos e administradores podem adicionar arquivos.</p>}
        {attachmentError && <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-500">{attachmentError}</p>}
        {attachmentsLoading ? <p className="text-sm text-gray-500">Carregando documentos…</p> : attachmentError ? null : attachments.length === 0 ? <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">Nenhum documento anexado a este caso.</p> : (
          <ul className="divide-y divide-gray-100">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{attachment.filename}</p>
                  {attachment.description && <p className="mt-0.5 text-sm text-gray-600">{attachment.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">{attachment.mimeType} · {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB · {attachment.uploadedBy.name} · {new Date(attachment.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-500">SHA-256: {attachment.sha256}</p>
                </div>
                <a className="btn-secondary btn-sm shrink-0" href={`/api/reports/${caseId}/attachments/${attachment.id}`}><Download size={14} aria-hidden="true" /> Baixar original</a>
              </li>
            ))}
          </ul>
        )}
      </section>

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
