// Tabelas neutras (sem formato) construídas dos dados do caso. Servem de base para Excel, CSV, TXT e HTML.
import type { CaseData } from "../case-types";
import type { Gap } from "../watson/types";
import { nameOf } from "../watson/trace";
import { toDate } from "../text";
import { ALGORITHM_LABEL, CATEGORY_LABEL, EVIDENCE_TYPE_LABEL, PRIORITY_LABEL, STATUS_LABEL, TASK_STATUS_LABEL, SEVERITY_LABEL } from "../labels";

export type Cell = string | number | Date | null;
export type Table = { key: string; name: string; title: string; headers: string[]; rows: Cell[][]; widths: number[]; mono?: number[]; severityCol?: number };
export type ExportMeta = { generatedAt: Date; generatedBy: string; doc: "full" | "laudo" };

const s = (v: string | null | undefined) => v ?? "";
const dev = (d: CaseData["devices"][number] | undefined) => (d ? `${d.code} — ${[d.brand, d.model].filter(Boolean).join(" ") || d.type}` : "");

export function buildTables(data: CaseData, gaps: Gap[], meta: ExportMeta): Table[] {
  const evCode = (id: string | null) => data.evidences.find((e) => e.id === id)?.code ?? "";
  const user = (id: string | null) => (id ? data.userNames[id] ?? "" : "");
  const T: Table[] = [];

  T.push({ key: "evidencias", name: "Evidências", title: "Evidências", widths: [16, 11, 18, 40, 24, 22, 18, 22, 20, 16, 12, 12, 9, 9],
    headers: ["Código", "Categoria", "Tipo", "Descrição", "Dispositivo", "Origem", "Coletada em", "Local da coleta", "Coletada por", "Estado", "Tamanho", "Formato", "Hashes", "Custódia"],
    rows: data.evidences.map((e) => [e.code, CATEGORY_LABEL[e.category] ?? e.category, EVIDENCE_TYPE_LABEL[e.type] ?? e.type, e.description,
      dev(data.devices.find((d) => d.id === e.deviceId)), s(e.origin), toDate(e.collectedAt), s(e.collectionPlace), user(e.collectedById), s(e.state), s(e.size), s(e.format), e.hashes.length, e.custodyEvents.length]) });

  T.push({ key: "hashes", name: "Hashes", title: "Hashes de integridade", widths: [16, 11, 70, 18, 20, 30], mono: [2],
    headers: ["Evidência", "Algoritmo", "Valor", "Calculado em", "Calculado por", "Observações"],
    rows: data.evidences.flatMap((e) => e.hashes.map((h) => [e.code, ALGORITHM_LABEL[h.algorithm] ?? h.algorithm, h.value, toDate(h.calculatedAt), user(h.calculatedById), s(h.notes)])) });

  T.push({ key: "custodia", name: "Cadeia de custódia", title: "Cadeia de custódia", widths: [16, 18, 18, 24, 24, 24, 30, 20],
    headers: ["Evidência", "Data/hora", "Ação", "De", "Para", "Local", "Motivo", "Registrado por"],
    rows: data.evidences.flatMap((e) => e.custodyEvents.map((c) => [e.code, toDate(c.occurredAt), c.action, s(c.fromCustodian), c.toCustodian, s(c.location), s(c.reason), user(c.registeredById)])) });

  T.push({ key: "analises", name: "Análises", title: "Análises realizadas", widths: [16, 16, 24, 20, 10, 20, 18, 44, 44, 44],
    headers: ["Código", "Evidência", "Tipo", "Ferramenta", "Versão", "Responsável", "Realizada em", "Procedimento", "Resultado", "Conclusão"],
    rows: data.analyses.map((a) => [a.code, evCode(a.evidenceId), a.type, a.tool?.name ?? "", a.tool?.version ?? "", a.performedBy.name, toDate(a.performedAt), s(a.procedure), s(a.result), s(a.conclusion)]) });

  T.push({ key: "achados", name: "Achados", title: "Achados", widths: [16, 30, 60, 16, 16, 16, 18],
    headers: ["Código", "Título", "Descrição", "Tipo", "Evidência", "Análise", "Identificado em"],
    rows: data.findings.map((f) => [f.code, f.title, f.description, s(f.type), evCode(f.evidenceId), data.analyses.find((a) => a.id === f.analysisId)?.code ?? "", toDate(f.identifiedAt)]) });

  // linha do tempo
  const tl: { at: Date; cat: string; ev: string; src: string }[] = [];
  const pushTl = (d: Date | string | null | undefined, cat: string, ev: string, src: string) => { const x = toDate(d); if (x) tl.push({ at: x, cat, ev, src }); };
  pushTl(data.openedAt, "Caso", "Abertura do caso", data.code);
  data.events.forEach((e) => pushTl(e.occurredAt, e.category ?? "Evento", e.title + (e.description ? ` — ${e.description}` : ""), "Evento manual"));
  data.evidences.forEach((e) => {
    pushTl(e.collectedAt, "Coleta", `Coleta: ${e.description}${e.collectionPlace ? ` (${e.collectionPlace})` : ""}`, e.code);
    e.custodyEvents.forEach((c) => pushTl(c.occurredAt, "Custódia", `${c.action}: ${c.fromCustodian ?? "—"} → ${c.toCustodian}`, e.code));
    e.hashes.forEach((h) => pushTl(h.calculatedAt, "Integridade", `Hash ${ALGORITHM_LABEL[h.algorithm] ?? h.algorithm} registrado`, e.code));
  });
  data.analyses.forEach((a) => pushTl(a.performedAt, "Análise", `${a.type}${a.tool ? ` (${a.tool.name})` : ""}`, a.code));
  data.findings.forEach((f) => pushTl(f.identifiedAt, "Achado", f.title, f.code));
  data.imports.forEach((i) => pushTl(i.createdAt, "Importação", `Arquivo ${i.filename} (${i.rowCount} linhas)`, i.tool?.name ?? "Importação"));
  tl.sort((a, b) => a.at.getTime() - b.at.getTime());
  T.push({ key: "linha-do-tempo", name: "Linha do tempo", title: "Linha do tempo", widths: [18, 14, 70, 20], headers: ["Data/hora", "Categoria", "Evento", "Fonte"], rows: tl.map((x) => [x.at, x.cat, x.ev, x.src]) });

  if (meta.doc === "full") {
    T.unshift(
      { key: "pessoas", name: "Pessoas", title: "Pessoas", widths: [16, 28, 20, 18, 28, 18, 30], headers: ["Código", "Nome", "Papel", "Documento", "E-mail", "Telefone", "Observações"],
        rows: data.people.map((p) => [p.code, p.name, s(p.role), s(p.document), s(p.email), s(p.phone), s(p.notes)]) },
      { key: "dispositivos", name: "Dispositivos", title: "Dispositivos", widths: [16, 16, 14, 18, 18, 18, 18, 26, 30], headers: ["Código", "Tipo", "Marca", "Modelo", "Série", "IMEI", "MAC", "Pessoa", "Observações"],
        rows: data.devices.map((d) => [d.code, EVIDENCE_TYPE_LABEL[d.type] ?? d.type, s(d.brand), s(d.model), s(d.serialNumber), s(d.imei), s(d.macAddress), data.people.find((p) => p.id === d.personId)?.name ?? "", s(d.notes)]) }
    );
    T.push(
      { key: "tarefas", name: "Tarefas", title: "Tarefas", widths: [50, 16, 16, 22, 16], headers: ["Tarefa", "Situação", "Prazo", "Responsável", "Evidência"],
        rows: data.tasks.map((t) => [t.title, TASK_STATUS_LABEL[t.status] ?? t.status, toDate(t.dueDate), t.assignedTo?.name ?? "", evCode(t.evidenceId)]) },
      { key: "relacionamentos", name: "Relacionamentos", title: "Relacionamentos", widths: [40, 24, 40], headers: ["Origem", "Rótulo", "Destino"],
        rows: data.relationships.map((r) => [nameOf(data, r.sourceType, r.sourceId), s(r.label), nameOf(data, r.targetType, r.targetId)]) },
      { key: "diario", name: "Diário do perito", title: "Diário do perito", widths: [18, 22, 90], headers: ["Data/hora", "Autor", "Nota"],
        rows: data.caseNotes.map((n) => [toDate(n.createdAt), n.author.name, n.text]) },
      { key: "importacoes", name: "Importações", title: "Importações de ferramentas", widths: [18, 30, 18, 20, 16, 10, 20, 50], headers: ["Data", "Arquivo", "Formato", "Ferramenta", "Evidência", "Linhas", "Importado por", "Resumo"],
        rows: data.imports.map((i) => [toDate(i.createdAt), i.filename, i.source, i.tool?.name ?? "", evCode(i.evidenceId), i.rowCount, i.importedBy.name, s(i.summary)]) },
      { key: "lacunas", name: "Lacunas (Watson)", title: "Lacunas e pendências apontadas pelo Watson", widths: [12, 38, 70, 22, 50], severityCol: 0,
        headers: ["Severidade", "Lacuna", "O que foi observado", "Fontes", "Sugestão do Watson"],
        rows: gaps.map((g) => [SEVERITY_LABEL[g.severity], g.title, g.detail, g.sources.map((x) => x.code).join(", "), s(g.suggestion)]) }
    );
  }
  return T;
}

export function summaryPairs(data: CaseData, meta: ExportMeta, fingerprint: string): [string, string | number | Date | null][] {
  return [
    ["Código do caso", data.code], ["Nome", data.name], ["Descrição", s(data.description)],
    ["Situação", STATUS_LABEL[data.status] ?? data.status], ["Prioridade", PRIORITY_LABEL[data.priority] ?? data.priority],
    ["Perito responsável", data.responsible.name], ["Aberto em", toDate(data.openedAt)], ["Encerrado em", toDate(data.closedAt)],
    ["Pessoas", data.people.length], ["Dispositivos", data.devices.length], ["Evidências", data.evidences.length],
    ["Análises", data.analyses.length], ["Achados", data.findings.length],
    ["Tarefas abertas", data.tasks.filter((t) => t.status !== "CONCLUIDA").length],
    ["Documento", meta.doc === "laudo" ? "Minuta de laudo" : "Pacote completo do caso"],
    ["Gerado em", meta.generatedAt], ["Gerado por", meta.generatedBy],
    ["Impressão digital dos dados (SHA-256)", fingerprint]
  ];
}
