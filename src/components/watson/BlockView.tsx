"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, Download, ListPlus, TriangleAlert } from "lucide-react";
import type { Block, Gap, SourceRef, TraceStep } from "@/lib/watson/types";
import CopyButton from "@/components/ui/CopyButton";
import { useToast } from "@/components/ui/Providers";
import { SEVERITY_LABEL } from "@/lib/labels";

const SEV_BADGE: Record<string, string> = { alta: "badge-red", media: "badge-amber", baixa: "badge-neutral", info: "badge-blue" };
const CAT_LABEL: Record<string, string> = { PROCEDIMENTO: "Procedimento", FERRAMENTA: "Ferramenta", CHECKLIST: "Checklist", NORMA: "Norma", ALERTA: "Alerta", GLOSSARIO: "Glossário", MODELO_TEXTO: "Modelo de texto" };

export function SourceChips({ sources }: { sources?: SourceRef[] }) {
  if (!sources?.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {sources.slice(0, 6).map((s, i) => s.href
        ? <Link key={i} href={s.href} className="tag-code hover:underline" title={`${s.kind}: ${s.code}`}>{s.code}</Link>
        : <span key={i} className="tag-code" title={s.kind}>{s.code}</span>)}
    </span>
  );
}

function GapCard({ gap, caseId, canEdit }: { gap: Gap; caseId: string; canEdit: boolean }) {
  const toast = useToast();
  const [open, setOpen] = useState(gap.severity === "alta");
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");

  async function createTask() {
    if (!gap.task) return;
    setState("busy");
    const res = await fetch(`/api/cases/${caseId}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: gap.task }) });
    if (res.ok) { setState("done"); toast("Tarefa criada no caso.", "ok"); } else { setState("idle"); toast((await res.json().catch(() => ({}))).error ?? "Não foi possível criar a tarefa.", "error"); }
  }

  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span className={`badge ${SEV_BADGE[gap.severity]}`}>{SEVERITY_LABEL[gap.severity]}</span>
        <span className="flex-1 text-sm font-medium text-gray-900">{gap.title}</span>
        <ChevronDown size={16} className={`shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="space-y-2 border-t border-gray-100 px-3 py-3 text-sm">
          <p className="text-gray-700"><span className="font-medium text-gray-900">Observado nos registros:</span> {gap.detail}</p>
          {gap.suggestion && <p className="text-gray-600"><span className="font-medium text-gray-900">Sugestão do Watson:</span> {gap.suggestion}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <SourceChips sources={gap.sources} />
            {canEdit && gap.task && (
              <button type="button" className="btn-secondary btn-sm ml-auto" disabled={state !== "idle"} onClick={createTask}>
                <ListPlus size={13} aria-hidden="true" />{state === "done" ? "Tarefa criada" : state === "busy" ? "Criando…" : "Criar tarefa"}
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function TraceColumn({ title, steps, empty }: { title: string; steps: TraceStep[]; empty: string }) {
  return (
    <div>
      <h4 className="eyebrow mb-2">{title}</h4>
      {steps.length === 0 ? <p className="text-sm text-gray-500">{empty}</p> : (
        <ol className="relative space-y-3 border-l border-gray-200 pl-4">
          {steps.map((s, i) => (
            <li key={i} className="relative text-sm">
              <span aria-hidden="true" className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-white" style={{ borderColor: "rgb(var(--brand-500))" }} />
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {s.at ? <time>{new Date(s.at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time> : <span>sem data</span>}
                <span className="badge badge-neutral">{s.kind}</span><SourceChips sources={[s.source]} />
              </div>
              <p className="mt-0.5 break-words text-gray-800">{s.text}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Draft({ title, text }: { title: string; text: string }) {
  const parts = text.split(/(\[PREENCHER:[^\]]*\])/g);
  function download() {
    const blob = new Blob(["\uFEFF" + text.replace(/\n/g, "\r\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${title.replace(/[^\w-]+/g, "_")}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2"><h4 className="text-sm font-semibold text-gray-900">{title}</h4><span className="ml-auto flex gap-1"><CopyButton text={text} /><button type="button" className="btn-ghost btn-sm" onClick={download}><Download size={14} aria-hidden="true" /> .txt</button></span></div>
      <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap p-4 font-mono text-[12.5px] leading-relaxed text-gray-800">
        {parts.map((p, i) => p.startsWith("[PREENCHER:") ? <mark key={i} className="rounded bg-amber-400/30 px-0.5 text-gray-900">{p}</mark> : <span key={i}>{p}</span>)}
      </pre>
    </div>
  );
}

export default function BlockView({ block, caseId, canEdit, onAsk }: { block: Block; caseId?: string; canEdit: boolean; onAsk: (q: string) => void }) {
  switch (block.type) {
    case "text": {
      const tone = block.tone === "warn" ? "border-amber-500/40 bg-amber-500/10" : block.tone === "ok" ? "border-green-500/40 bg-green-500/10" : block.tone === "info" ? "border-blue-500/30 bg-blue-500/10" : "border-transparent";
      return <p className={`whitespace-pre-line rounded-lg border px-3 py-2 text-sm text-gray-800 ${tone}`}>{block.text}</p>;
    }
    case "list":
      return (
        <div>{block.title && <h4 className="eyebrow mb-1.5">{block.title}</h4>}
          <ul className="space-y-1.5 text-sm text-gray-800">{block.items.map((it, i) => <li key={i} className="flex flex-wrap items-center gap-2">• {it.text} <SourceChips sources={it.sources} /></li>)}</ul></div>
      );
    case "table": {
      const tsv = [block.columns.join("\t"), ...block.rows.map((r) => r.join("\t"))].join("\n");
      return (
        <div>
          <div className="mb-1.5 flex items-center gap-2">{block.title && <h4 className="eyebrow">{block.title}</h4>}<span className="ml-auto"><CopyButton text={tsv} label="Copiar tabela" /></span></div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="table-base"><thead><tr>{block.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={/^[a-f0-9]{32,64}$/i.test(c) ? "font-mono text-xs break-all" : ""}>{c === "SEM HASH" || c === "SEM CUSTÓDIA" ? <span className="badge badge-red">{c}</span> : c}</td>)}</tr>)}</tbody></table>
          </div>
          {block.note && <p className="mt-1.5 text-xs text-gray-500">{block.note}</p>}
        </div>
      );
    }
    case "gaps":
      return (
        <div>{block.title && <h4 className="eyebrow mb-2">{block.title}</h4>}
          <ul className="space-y-2">{block.items.map((g) => <GapCard key={g.id} gap={g} caseId={block.caseId} canEdit={canEdit} />)}</ul></div>
      );
    case "trace":
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="font-display mb-3 text-base font-semibold text-gray-900">{block.title}</h3>
          <div className="grid gap-6 md:grid-cols-2">
            <TraceColumn title="De onde veio" steps={block.origin} empty="Nenhum registro de origem." />
            <TraceColumn title="O que aconteceu depois" steps={[...block.after, ...block.undated]} empty="Nada registrado depois." />
          </div>
          {block.missing.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2 font-medium text-gray-900"><TriangleAlert size={15} className="text-amber-500" aria-hidden="true" /> Não consta nos registros</div>
              <ul className="list-disc space-y-0.5 pl-5 text-gray-700">{block.missing.map((m, i) => <li key={i}>{m}</li>)}</ul>
              <p className="mt-1.5 text-xs text-gray-500">O Watson não preenche essas informações. Complete-as com a documentação do caso.</p>
            </div>
          )}
        </div>
      );
    case "advice":
      return (
        <div>{block.title && <h4 className="eyebrow mb-2">{block.title}</h4>}
          <ul className="space-y-2">{block.items.map((a) => <AdviceCard key={a.id} a={a} />)}</ul></div>
      );
    case "draft":
      return <Draft title={block.title} text={block.text} />;
    case "matches":
      return (
        <div>{block.title && <h4 className="eyebrow mb-2">{block.title}</h4>}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {block.items.map((m, i) => (
              <li key={i}><Link href={`/cases/${m.caseId}`} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100">
                <span className="badge badge-neutral">{m.kind}</span><span className="font-medium text-gray-900">{m.title}</span><span className="text-xs text-gray-500">{m.detail}</span><span className="tag-code ml-auto">{m.caseCode}</span></Link></li>
            ))}
          </ul></div>
      );
    case "suggestions":
      return (
        <div className="flex flex-wrap gap-2 pt-1">
          {block.items.map((s) => <button key={s} type="button" onClick={() => onAsk(s)} className="badge badge-neutral cursor-pointer !px-3 !py-1 hover:border-brand-500">{s}</button>)}
        </div>
      );
  }
}

function AdviceCard({ a }: { a: { id: string; title: string; category: string; summary: string; content: string; source: string | null; reason: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-gray-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <BookOpen size={16} className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true" />
        <span className="flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-gray-900">{a.title}</span><span className="badge badge-violet">{CAT_LABEL[a.category] ?? a.category}</span></span>
          <span className="mt-0.5 block text-sm text-gray-600">{a.summary}</span><span className="mt-1 block text-xs italic text-gray-500">{a.reason}</span></span>
        <ChevronDown size={16} className={`mt-0.5 shrink-0 text-gray-500 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open && <div className="border-t border-gray-100 px-3 py-3"><p className="whitespace-pre-line text-sm text-gray-800">{a.content}</p>{a.source && <p className="mt-2 text-xs text-gray-500"><b>Fonte:</b> {a.source}</p>}<p className="mt-1 text-xs text-gray-500">Conhecimento geral da biblioteca; não é dado do caso.</p></div>}
    </li>
  );
}
