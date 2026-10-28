import type { CaseData } from "../case-types";
import type { Block, Gap } from "./types";
import { STATUS_LABEL, PRIORITY_LABEL, EVIDENCE_TYPE_LABEL, TASK_STATUS_LABEL } from "../labels";
import { fmtDate, fmtDateTime, toDate } from "../text";
import { ref } from "./refs";

export function buildSummary(data: CaseData, gaps: Gap[]): Block[] {
  const pendingTasks = data.tasks.filter((t) => t.status !== "CONCLUIDA").length;
  const high = gaps.filter((g) => g.severity === "alta").length;
  const med = gaps.filter((g) => g.severity === "media").length;
  const allDates = [
    ...data.events.map((e) => e.occurredAt), ...data.evidences.flatMap((e) => [e.collectedAt, ...e.custodyEvents.map((c) => c.occurredAt)]),
    ...data.analyses.map((a) => a.performedAt)
  ].map(toDate).filter((d): d is Date => !!d).map((d) => d.getTime());

  const blocks: Block[] = [
    { type: "text", text:
      `${data.code} — ${data.name}. Situação: ${STATUS_LABEL[data.status] ?? data.status}; prioridade ${PRIORITY_LABEL[data.priority] ?? data.priority}; responsável ${data.responsible.name}; aberto em ${fmtDate(data.openedAt)}.\n` +
      `Registros: ${data.people.length} pessoa(s), ${data.devices.length} dispositivo(s), ${data.evidences.length} evidência(s), ${data.analyses.length} análise(s), ${data.findings.length} achado(s), ${data.caseNotes.length} nota(s) do diário, ${data.imports.length} importação(ões).\n` +
      (allDates.length ? `Atividade registrada entre ${fmtDateTime(new Date(Math.min(...allDates)))} e ${fmtDateTime(new Date(Math.max(...allDates)))}.\n` : "") +
      `Tarefas pendentes: ${pendingTasks}. Lacunas detectadas: ${gaps.length} (${high} alta, ${med} média).`
    },
    {
      type: "table", title: "Evidências e situação de integridade",
      columns: ["Código", "Tipo", "Hash", "Custódia", "Análises", "Achados"],
      rows: data.evidences.map((e) => [
        e.code,
        EVIDENCE_TYPE_LABEL[e.type] ?? e.type,
        e.category === "FISICA" ? "n/a (física)" : e.hashes.length ? [...new Set(e.hashes.map((h) => h.algorithm))].join(", ") : "SEM HASH",
        e.custodyEvents.length ? `${e.custodyEvents.length} evento(s)` : "SEM CUSTÓDIA",
        String(data.analyses.filter((a) => a.evidenceId === e.id).length),
        String(data.findings.filter((f) => f.evidenceId === e.id).length)
      ]),
      note: "Dados lidos diretamente dos registros do caso."
    }
  ];
  if (data.tasks.length) {
    blocks.push({ type: "list", title: "Tarefas", items: data.tasks.slice(0, 10).map((t) => ({ text: `${t.title} — ${TASK_STATUS_LABEL[t.status] ?? t.status}`, sources: [ref("Tarefa", t.title.slice(0, 30), data.id)] })) });
  }
  return blocks;
}

export function buildTimeline(data: CaseData): Block {
  type Row = { at: Date; text: string };
  const rows: Row[] = [];
  const add = (d: Date | string | null | undefined, text: string) => { const x = toDate(d); if (x) rows.push({ at: x, text }); };
  add(data.openedAt, `Caso ${data.code} aberto.`);
  for (const e of data.events) add(e.occurredAt, `${e.title}${e.category ? ` [${e.category}]` : ""}`);
  for (const ev of data.evidences) {
    add(ev.collectedAt, `Coleta de ${ev.code} (${ev.description})${ev.collectionPlace ? ` em ${ev.collectionPlace}` : ""}.`);
    for (const c of ev.custodyEvents) add(c.occurredAt, `Custódia de ${ev.code}: ${c.action} → ${c.toCustodian}.`);
    for (const h of ev.hashes) add(h.calculatedAt, `Hash ${h.algorithm} registrado para ${ev.code}.`);
  }
  for (const a of data.analyses) add(a.performedAt, `Análise ${a.code} (${a.type}).`);
  for (const f of data.findings) add(f.identifiedAt, `Achado ${f.code}: ${f.title}.`);
  for (const i of data.imports) add(i.createdAt, `Importação "${i.filename}" (${i.rowCount} linha(s)).`);
  rows.sort((a, b) => a.at.getTime() - b.at.getTime());
  return { type: "table", title: "Linha do tempo (montada dos registros)", columns: ["Data/hora", "Registro"], rows: rows.map((r) => [fmtDateTime(r.at), r.text]), note: "Itens sem data não aparecem aqui. Confira fuso horário das fontes originais." };
}
