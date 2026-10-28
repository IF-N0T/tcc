// Procedência: "de onde veio" e "o que foi feito depois", montados SOMENTE a partir dos registros.
import type { CaseData } from "../case-types";
import type { TraceStep, SourceRef } from "./types";
import { ref } from "./refs";
import { toDate, fmtDateTime } from "../text";
import { ALGORITHM_LABEL, EVIDENCE_TYPE_LABEL } from "../labels";

export type Entity =
  | { kind: "Evidência"; obj: CaseData["evidences"][number] }
  | { kind: "Achado"; obj: CaseData["findings"][number] }
  | { kind: "Análise"; obj: CaseData["analyses"][number] }
  | { kind: "Dispositivo"; obj: CaseData["devices"][number] }
  | { kind: "Pessoa"; obj: CaseData["people"][number] };

export function findEntityByCode(data: CaseData, rawCode: string): Entity | null {
  const code = rawCode.toUpperCase();
  const ev = data.evidences.find((e) => e.code.toUpperCase() === code); if (ev) return { kind: "Evidência", obj: ev };
  const f = data.findings.find((e) => e.code.toUpperCase() === code); if (f) return { kind: "Achado", obj: f };
  const a = data.analyses.find((e) => e.code.toUpperCase() === code); if (a) return { kind: "Análise", obj: a };
  const d = data.devices.find((e) => e.code.toUpperCase() === code); if (d) return { kind: "Dispositivo", obj: d };
  const p = data.people.find((e) => e.code.toUpperCase() === code); if (p) return { kind: "Pessoa", obj: p };
  return null;
}

const step = (at: Date | string | null | undefined, kind: string, code: string, text: string, source: SourceRef): TraceStep => ({
  at: toDate(at)?.toISOString() ?? null, kind, code, text, source
});

function who(data: CaseData, id: string | null | undefined) {
  return id ? data.userNames[id] ?? null : null;
}

function evidenceOrigin(data: CaseData, ev: CaseData["evidences"][number], missing: string[]): TraceStep[] {
  const out: TraceStep[] = [];
  const cid = data.id;
  const device = ev.deviceId ? data.devices.find((d) => d.id === ev.deviceId) : undefined;
  const person = device?.personId ? data.people.find((p) => p.id === device.personId) : undefined;
  if (person) {
    out.push(step(null, "Pessoa", person.code, `${person.name}${person.role ? ` (${person.role})` : ""} é associada ao dispositivo ${device!.code}.`, ref("Pessoa", person.code, cid)));
  }
  if (device) {
    out.push(step(null, "Dispositivo", device.code, `${EVIDENCE_TYPE_LABEL[device.type] ?? device.type} ${[device.brand, device.model].filter(Boolean).join(" ")}${device.imei ? `, IMEI ${device.imei}` : ""}${device.serialNumber ? `, série ${device.serialNumber}` : ""}.`, ref("Dispositivo", device.code, cid)));
  } else if (ev.category === "DIGITAL") {
    missing.push(`${ev.code} não está vinculada a nenhum dispositivo; o aparelho/origem de onde saiu não está registrado.`);
  }
  const parts = [
    ev.collectedAt ? `coletada em ${fmtDateTime(ev.collectedAt)}` : null,
    ev.collectionPlace ? `local: ${ev.collectionPlace}` : null,
    who(data, ev.collectedById) ? `por ${who(data, ev.collectedById)}` : null,
    ev.origin ? `origem: ${ev.origin}` : null,
    ev.state ? `estado: ${ev.state}` : null
  ].filter(Boolean);
  out.push(step(ev.collectedAt, "Evidência", ev.code, `${ev.description}${parts.length ? " — " + parts.join("; ") : ""}.`, ref("Evidência", ev.code, cid)));
  if (!ev.collectedAt) missing.push(`${ev.code}: data da coleta não registrada.`);
  if (!ev.collectionPlace) missing.push(`${ev.code}: local da coleta não registrado.`);
  if (!ev.collectedById && !ev.origin) missing.push(`${ev.code}: responsável pela coleta/origem não registrado.`);
  return out;
}

function evidenceAfter(data: CaseData, ev: CaseData["evidences"][number]): TraceStep[] {
  const cid = data.id;
  const out: TraceStep[] = [];
  for (const h of ev.hashes) {
    out.push(step(h.calculatedAt, "Hash", ev.code, `Hash ${ALGORITHM_LABEL[h.algorithm] ?? h.algorithm} registrado: ${h.value}${who(data, h.calculatedById) ? ` (por ${who(data, h.calculatedById)})` : ""}.`, ref("Evidência", ev.code, cid)));
  }
  for (const c of ev.custodyEvents) {
    out.push(step(c.occurredAt, "Custódia", ev.code, `${c.action}: ${c.fromCustodian ?? "(origem não informada)"} → ${c.toCustodian}${c.location ? ` em ${c.location}` : ""}${c.reason ? ` — motivo: ${c.reason}` : ""}.`, ref("Evidência", ev.code, cid)));
  }
  for (const a of data.analyses.filter((x) => x.evidenceId === ev.id)) {
    out.push(step(a.performedAt, "Análise", a.code, `${a.type} por ${a.performedBy.name}${a.tool ? ` com ${a.tool.name}${a.tool.version ? " " + a.tool.version : ""}` : " (ferramenta não registrada)"}${a.conclusion ? ` — conclusão registrada: ${a.conclusion}` : ""}.`, ref("Análise", a.code, cid)));
  }
  for (const f of data.findings.filter((x) => x.evidenceId === ev.id || data.analyses.some((a) => a.id === x.analysisId && a.evidenceId === ev.id))) {
    out.push(step(f.identifiedAt, "Achado", f.code, `${f.title}.`, ref("Achado", f.code, cid)));
  }
  for (const i of data.imports.filter((x) => x.evidenceId === ev.id)) {
    out.push(step(i.createdAt, "Importação", i.filename, `Arquivo "${i.filename}" importado${i.tool ? ` de ${i.tool.name}` : ""} (${i.rowCount} linha(s)) por ${i.importedBy.name}.`, ref("Importação", i.filename, cid)));
  }
  for (const t of data.tasks.filter((x) => x.evidenceId === ev.id)) {
    out.push(step(t.createdAt, "Tarefa", t.title, `Tarefa "${t.title}" (${t.status}).`, ref("Tarefa", t.title.slice(0, 30), cid)));
  }
  return out;
}

export function sortSteps(steps: TraceStep[]) {
  const dated = steps.filter((s) => s.at).sort((a, b) => a.at!.localeCompare(b.at!));
  const undated = steps.filter((s) => !s.at);
  return { dated, undated };
}

export function traceEntity(data: CaseData, entity: Entity) {
  const cid = data.id;
  const missing: string[] = [];
  let origin: TraceStep[] = [];
  let after: TraceStep[] = [];
  let title = "";

  if (entity.kind === "Evidência") {
    const ev = entity.obj;
    title = `Procedência de ${ev.code}`;
    origin = evidenceOrigin(data, ev, missing);
    after = evidenceAfter(data, ev).filter((s) => s.kind !== "Evidência");
  } else if (entity.kind === "Análise") {
    const a = entity.obj;
    title = `Procedência de ${a.code}`;
    const ev = data.evidences.find((e) => e.id === a.evidenceId);
    if (ev) origin = evidenceOrigin(data, ev, missing);
    origin.push(step(a.performedAt, "Análise", a.code, `${a.type} por ${a.performedBy.name}${a.tool ? ` com ${a.tool.name}` : ""}. Procedimento: ${a.procedure ?? "não registrado"}.`, ref("Análise", a.code, cid)));
    if (!a.tool) missing.push(`${a.code}: ferramenta não registrada.`);
    if (!a.procedure) missing.push(`${a.code}: procedimento não registrado.`);
    after = data.findings.filter((f) => f.analysisId === a.id).map((f) => step(f.identifiedAt, "Achado", f.code, `${f.title}.`, ref("Achado", f.code, cid)));
  } else if (entity.kind === "Achado") {
    const f = entity.obj;
    title = `Procedência de ${f.code}`;
    const analysis = f.analysisId ? data.analyses.find((a) => a.id === f.analysisId) : undefined;
    const ev = f.evidenceId ? data.evidences.find((e) => e.id === f.evidenceId) : analysis ? data.evidences.find((e) => e.id === analysis.evidenceId) : undefined;
    if (ev) origin = evidenceOrigin(data, ev, missing);
    if (analysis) origin.push(step(analysis.performedAt, "Análise", analysis.code, `${analysis.type} por ${analysis.performedBy.name}${analysis.tool ? ` com ${analysis.tool.name}` : ""}. Procedimento: ${analysis.procedure ?? "não registrado"}.`, ref("Análise", analysis.code, cid)));
    origin.push(step(f.identifiedAt, "Achado", f.code, `${f.title}: ${f.description}`, ref("Achado", f.code, cid)));
    if (!ev && !analysis) missing.push(`${f.code} não está vinculado a nenhuma evidência ou análise: não há registro de onde ele foi obtido.`);
    if (analysis && !analysis.tool) missing.push(`${analysis.code}: ferramenta não registrada.`);
    after = [
      ...data.tasks.filter((t) => t.findingId === f.id).map((t) => step(t.createdAt, "Tarefa", t.title, `Tarefa "${t.title}" (${t.status}).`, ref("Tarefa", t.title.slice(0, 30), cid))),
      ...data.relationships.filter((r) => r.sourceId === f.id || r.targetId === f.id).map((r) => step(null, "Relacionamento", f.code, `Conexão "${r.label ?? "sem rótulo"}" com ${nameOf(data, r.sourceId === f.id ? r.targetType : r.sourceType, r.sourceId === f.id ? r.targetId : r.sourceId)}.`, ref("Achado", f.code, cid)))
    ];
  } else if (entity.kind === "Dispositivo") {
    const d = entity.obj;
    title = `Procedência de ${d.code}`;
    const person = d.personId ? data.people.find((p) => p.id === d.personId) : undefined;
    if (person) origin.push(step(null, "Pessoa", person.code, `${person.name}${person.role ? ` (${person.role})` : ""}.`, ref("Pessoa", person.code, cid)));
    else missing.push(`${d.code} não está associado a nenhuma pessoa.`);
    origin.push(step(d.createdAt, "Dispositivo", d.code, `${EVIDENCE_TYPE_LABEL[d.type] ?? d.type} ${[d.brand, d.model].filter(Boolean).join(" ")} cadastrado.`, ref("Dispositivo", d.code, cid)));
    for (const ev of data.evidences.filter((e) => e.deviceId === d.id)) after.push(...evidenceOrigin(data, ev, missing).filter((s) => s.kind === "Evidência"), ...evidenceAfter(data, ev));
  } else {
    const p = entity.obj;
    title = `Vínculos de ${p.code}`;
    origin.push(step(p.createdAt, "Pessoa", p.code, `${p.name}${p.role ? ` (${p.role})` : ""} cadastrada no caso.`, ref("Pessoa", p.code, cid)));
    for (const d of data.devices.filter((x) => x.personId === p.id)) {
      after.push(step(d.createdAt, "Dispositivo", d.code, `${EVIDENCE_TYPE_LABEL[d.type] ?? d.type} ${[d.brand, d.model].filter(Boolean).join(" ")} associado.`, ref("Dispositivo", d.code, cid)));
      for (const ev of data.evidences.filter((e) => e.deviceId === d.id)) after.push(step(ev.collectedAt ?? ev.createdAt, "Evidência", ev.code, `${ev.description} (originada de ${d.code}).`, ref("Evidência", ev.code, cid)));
    }
    if (!after.length) missing.push(`${p.code} não tem dispositivos associados.`);
  }

  const originSorted = sortSteps(origin);
  const afterSorted = sortSteps(after);
  return {
    title,
    origin: [...originSorted.undated, ...originSorted.dated],
    after: afterSorted.dated,
    undated: afterSorted.undated,
    missing: [...new Set(missing)]
  };
}

export function nameOf(data: CaseData, type: string, id: string): string {
  if (type === "Person") { const p = data.people.find((x) => x.id === id); return p ? `${p.code} (${p.name})` : id; }
  if (type === "Device") { const d = data.devices.find((x) => x.id === id); return d ? `${d.code} (${[d.brand, d.model].filter(Boolean).join(" ") || d.type})` : id; }
  if (type === "Evidence") { const e = data.evidences.find((x) => x.id === id); return e ? `${e.code} (${e.description})` : id; }
  if (type === "Finding") { const f = data.findings.find((x) => x.id === id); return f ? `${f.code} (${f.title})` : id; }
  if (type === "CaseEvent") { const c = data.events.find((x) => x.id === id); return c ? c.title : id; }
  return id;
}
