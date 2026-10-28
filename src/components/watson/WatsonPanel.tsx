"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, Send, ShieldCheck } from "lucide-react";
import type { Block, WatsonResponse } from "@/lib/watson/types";
import BlockView from "./BlockView";
import WatsonMark from "./WatsonMark";

type CaseOpt = { id: string; code: string; name: string };
type Msg = { id: number; role: "user" | "watson"; text?: string; blocks?: Block[]; caseId?: string; loading?: boolean };

const QUICK: [string, string][] = [
  ["Resumo", "Resuma o caso"], ["Lacunas", "Quais lacunas existem neste caso?"], ["Próximos passos", "Quais os próximos passos?"],
  ["Linha do tempo", "Monte a linha do tempo"], ["Comparar casos", "Compare com outros casos"], ["Minhas notas", "O que as minhas notas citam que não está cadastrado?"],
  ["Conselhos", "Dê conselhos para este caso"], ["Rascunho de laudo", "Gere um rascunho do laudo"]
];

export default function WatsonPanel({ cases, fixedCaseId, canEdit, compact = false }: { cases: CaseOpt[]; fixedCaseId?: string; canEdit: boolean; compact?: boolean }) {
  const [caseId, setCaseId] = useState(fixedCaseId ?? "");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (fixedCaseId) return;
    try { const saved = sessionStorage.getItem("watson-case"); if (saved && cases.some((c) => c.id === saved)) setCaseId(saved); } catch {}
  }, [cases, fixedCaseId]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs]);

  function selectCase(id: string) { setCaseId(id); try { sessionStorage.setItem("watson-case", id); } catch {} }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const uid = ++seq.current, wid = ++seq.current;
    setMsgs((m) => [...m, { id: uid, role: "user", text: q }, { id: wid, role: "watson", loading: true }]);
    setInput(""); setBusy(true);
    try {
      const res = await fetch("/api/watson", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: q, caseId: caseId || null }) });
      const data = (await res.json()) as WatsonResponse & { error?: string };
      const blocks: Block[] = res.ok ? data.blocks : [{ type: "text", text: data.error ?? "Não consegui responder agora.", tone: "warn" }];
      setMsgs((m) => m.map((x) => (x.id === wid ? { ...x, loading: false, blocks, caseId: data.caseId ?? (caseId || undefined) } : x)));
      if (res.ok && data.caseId && !caseId && !fixedCaseId) selectCase(data.caseId);
    } catch {
      setMsgs((m) => m.map((x) => (x.id === wid ? { ...x, loading: false, blocks: [{ type: "text", text: "Falha de conexão. Verifique a rede e tente novamente.", tone: "warn" }] } : x)));
    } finally { setBusy(false); ta.current?.focus(); }
  }

  const current = cases.find((c) => c.id === caseId);

  return (
    <div className={`card flex flex-col overflow-hidden ${compact ? "min-h-[520px]" : "min-h-[640px]"}`}>
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white"><WatsonMark size={20} /></span>
        <div className="mr-auto"><div className="font-display text-base font-semibold text-gray-900">Assistente Watson</div><div className="text-xs text-gray-500">{current ? `Caso em foco: ${current.code}` : "Nenhum caso em foco (busca geral)"}</div></div>
        {!fixedCaseId && (
          <select className="input !w-auto max-w-[260px]" value={caseId} onChange={(e) => selectCase(e.target.value)} aria-label="Caso em foco">
            <option value="">Sem caso em foco</option>{cases.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </select>
        )}
        {msgs.length > 0 && <button type="button" className="btn-ghost btn-sm" onClick={() => setMsgs([])}><Eraser size={14} aria-hidden="true" /> Limpar</button>}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5" style={{ maxHeight: compact ? 560 : "62vh" }} aria-live="polite">
        {msgs.length === 0 && (
          <div className="rise mx-auto max-w-2xl space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-600/15 text-brand-500"><WatsonMark size={32} /></span>
            <h2 className="font-display text-xl font-semibold text-gray-900">Em que posso ajudar na investigação?</h2>
            <p className="text-sm text-gray-500">Organizo o que você já registrou, aponto lacunas, mostro de onde cada item veio e o que foi feito depois, e comparo com outros casos e com a biblioteca.</p>
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-left text-sm text-gray-700"><div className="mb-1 flex items-center gap-2 font-medium text-gray-900"><ShieldCheck size={15} className="text-green-500" aria-hidden="true" /> Como eu trabalho</div>
              <ul className="list-disc space-y-0.5 pl-5"><li>Cada afirmação sobre o caso vem dos seus registros e cita o código de origem.</li><li>Quando falta um dado, eu aponto a lacuna. Não invento nem completo valores.</li><li>Conselhos vêm da biblioteca, identificados como conhecimento geral, com fonte.</li></ul></div>
            {!caseId && <p className="text-xs text-amber-500">Selecione um caso acima para usar os atalhos abaixo.</p>}
          </div>
        )}

        {msgs.map((m) => m.role === "user" ? (
          <div key={m.id} className="flex justify-end"><p className="rise max-w-[85%] rounded-2xl rounded-br-sm bg-brand-700 px-4 py-2 text-sm text-white">{m.text}</p></div>
        ) : (
          <div key={m.id} className="rise flex gap-3">
            <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white"><WatsonMark size={17} /></span>
            <div className="min-w-0 flex-1 space-y-3">
              {m.loading ? <div className="space-y-2" aria-label="Watson está analisando"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-16 w-full" /></div>
                : m.blocks?.map((b, i) => <BlockView key={i} block={b} caseId={m.caseId} canEdit={canEdit} onAsk={ask} />)}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>

      <div className="border-t border-gray-200 p-3">
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Atalhos">
          {QUICK.map(([label, q]) => <button key={label} type="button" disabled={busy || !caseId} onClick={() => ask(q)} className="badge badge-neutral shrink-0 cursor-pointer !px-3 !py-1 enabled:hover:border-brand-500 disabled:cursor-not-allowed disabled:opacity-45">{label}</button>)}
        </div>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); ask(input); }}>
          <textarea ref={ta} className="input max-h-40 min-h-[44px] resize-none" rows={1} value={input} onChange={(e) => setInput(e.target.value)} maxLength={400}
            placeholder={caseId ? "Pergunte: “de onde veio a EVD-2026-0001?”, “quais lacunas?”…" : "Busque um nome, código ou assunto (ex.: Autopsy, hash, custódia)…"} aria-label="Pergunta ao Watson"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }} />
          <button type="submit" className="btn-primary !h-11" disabled={busy || input.trim().length < 2} aria-label="Enviar"><Send size={16} aria-hidden="true" /></button>
        </form>
        <p className="mt-1.5 text-[11px] text-gray-500">Enter envia · Shift+Enter quebra linha. O Watson usa regras e a biblioteca, sem IA generativa.</p>
      </div>
    </div>
  );
}
