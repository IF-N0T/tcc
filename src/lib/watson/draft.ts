// Rascunho de laudo: organiza o que JÁ está registrado e marca com [PREENCHER] o que falta.
import type { CaseData } from "../case-types";
import type { Gap } from "./types";
import { STATUS_LABEL, EVIDENCE_TYPE_LABEL, ALGORITHM_LABEL } from "../labels";
import { fmtDate, fmtDateTime } from "../text";

export function draftLaudo(data: CaseData, gaps: Gap[]): string {
  const L: string[] = [];
  const P = (what: string) => `[PREENCHER: ${what}]`;
  L.push(`RASCUNHO DE LAUDO — ${data.code}`);
  L.push("Gerado pelo Watson a partir dos registros do caso. Trechos entre [PREENCHER] dependem do perito.");
  L.push("Nenhuma informação foi acrescentada além dos registros; cada trecho cita os códigos de origem.");
  L.push("");
  L.push("1. IDENTIFICAÇÃO");
  L.push(`Caso: ${data.code} — ${data.name}`);
  L.push(`Perito responsável: ${data.responsible.name}`);
  L.push(`Abertura: ${fmtDate(data.openedAt)}   Situação: ${STATUS_LABEL[data.status] ?? data.status}`);
  L.push(`Solicitante: ${P("órgão/autoridade solicitante")}`);
  L.push("");
  L.push("2. HISTÓRICO E OBJETIVO");
  L.push(data.description?.trim() ? `${data.description.trim()} [${data.code}]` : P("histórico do caso (o caso não tem descrição registrada)"));
  L.push(`Objetivo do exame: ${P("o que foi solicitado")}`);
  L.push("");
  L.push("3. MATERIAL EXAMINADO");
  if (!data.evidences.length) L.push(P("nenhuma evidência cadastrada"));
  for (const e of data.evidences) {
    L.push(`- ${e.code}: ${e.description} (${EVIDENCE_TYPE_LABEL[e.type] ?? e.type}).`);
    L.push(`  Coleta: ${e.collectedAt ? fmtDateTime(e.collectedAt) : P("data")}; local: ${e.collectionPlace ?? P("local")}; responsável: ${(e.collectedById && data.userNames[e.collectedById]) || e.origin || P("responsável/origem")}.`);
    if (e.category === "DIGITAL") {
      L.push(e.hashes.length ? `  Integridade: ${e.hashes.map((h) => `${ALGORITHM_LABEL[h.algorithm] ?? h.algorithm} ${h.value}`).join("; ")}.` : `  Integridade: ${P("hash da evidência")}`);
    }
    const c = e.custodyEvents;
    L.push(c.length ? `  Custódia: ${c.map((x) => `${fmtDateTime(x.occurredAt)} ${x.action} → ${x.toCustodian}`).join("; ")}.` : `  Custódia: ${P("eventos de custódia")}`);
  }
  L.push("");
  L.push("4. EXAMES REALIZADOS");
  if (!data.analyses.length) L.push(P("nenhuma análise registrada"));
  for (const a of data.analyses) {
    const ev = data.evidences.find((e) => e.id === a.evidenceId);
    L.push(`- ${a.code} (${a.type}) sobre ${ev?.code ?? "?"}, em ${fmtDateTime(a.performedAt)}, por ${a.performedBy.name}.`);
    L.push(`  Ferramenta: ${a.tool ? `${a.tool.name}${a.tool.version ? " " + a.tool.version : ""}` : P("ferramenta e versão")}.`);
    L.push(`  Procedimento: ${a.procedure ?? P("procedimento")}`);
  }
  L.push("");
  L.push("5. RESULTADOS");
  const withResult = data.analyses.filter((a) => a.result);
  if (!withResult.length && !data.findings.length) L.push(P("resultados"));
  for (const a of withResult) L.push(`- ${a.code}: ${a.result}`);
  for (const f of data.findings) L.push(`- ${f.code} — ${f.title}: ${f.description}${f.evidenceId ? ` [${data.evidences.find((e) => e.id === f.evidenceId)?.code ?? ""}]` : ` ${P("evidência/análise de origem")}`}`);
  L.push("");
  L.push("6. CONCLUSÃO");
  const concl = data.analyses.filter((a) => a.conclusion);
  if (concl.length) {
    L.push("Conclusões registradas nas análises (reproduzidas sem alteração):");
    for (const a of concl) L.push(`- ${a.code}: ${a.conclusion}`);
    L.push(`Conclusão geral: ${P("redija a conclusão geral com base nos itens acima")}`);
  } else L.push(P("nenhuma conclusão registrada"));
  L.push("");
  L.push("7. RESPOSTAS AOS QUESITOS");
  L.push(P("se houver quesitos, responda um a um citando ANA/EVD/ACH"));
  L.push("");
  const open = gaps.filter((g) => g.severity === "alta" || g.severity === "media");
  if (open.length) {
    L.push("PENDÊNCIAS DETECTADAS (resolver antes de emitir)");
    for (const g of open) L.push(`- [${g.severity.toUpperCase()}] ${g.title}`);
  }
  return L.join("\n");
}
