// Orquestra o Watson: classifica a pergunta, carrega o caso e monta blocos de resposta.
// Não usa IA generativa. Todo fato vem dos registros; o conhecimento geral vem da biblioteca e é rotulado.
import { prisma } from "../prisma";
import { loadCaseData } from "../case-data";
import type { Block, WatsonResponse, Gap } from "./types";
import { classify } from "./intent";
import { detectGaps } from "./gaps";
import { findEntityByCode, traceEntity } from "./trace";
import { buildSummary, buildTimeline } from "./summary";
import { draftLaudo } from "./draft";
import { adviseFromLibrary, searchLibrary, type LibEntry } from "./advice";
import { compareAcrossCases } from "./compare";
import { extractFromNotes } from "./notes";
import { searchRecords, resolveCaseFromCodes } from "./search";
import { fmtDateTime } from "../text";

const NEEDS_CASE = new Set(["trace", "gaps", "summary", "compare", "draft", "timeline", "notes", "next"]);

async function library(): Promise<LibEntry[]> {
  return prisma.knowledgeEntry.findMany({ select: { id: true, slug: true, title: true, category: true, summary: true, content: true, tags: true, appliesTo: true, source: true } });
}

function suggestionsFor(intent: string, hasCase: boolean): string[] {
  if (!hasCase) return ["Pesquisar por um nome, código ou palavra-chave", "Como registrar a cadeia de custódia?", "Como usar o Autopsy neste fluxo?", "Boas práticas para hash"];
  const all = ["Quais lacunas existem neste caso?", "Resuma o caso", "Quais os próximos passos?", "Compare com outros casos", "Monte a linha do tempo", "Gere um rascunho do laudo", "Dê conselhos para este caso", "O que as minhas notas citam que não está cadastrado?"];
  return all.filter((s) => !s.toLowerCase().includes(intent === "gaps" ? "lacunas" : intent === "summary" ? "resuma" : "§")).slice(0, 5);
}

export async function runWatson(message: string, caseIdIn?: string | null): Promise<WatsonResponse> {
  const { intent, codes } = classify(message);
  let caseId = caseIdIn || undefined;
  if (!caseId && codes.length) caseId = (await resolveCaseFromCodes(codes)) ?? undefined;

  const blocks: Block[] = [];
  const done = (i: string): WatsonResponse => {
    blocks.push({ type: "suggestions", items: suggestionsFor(i, !!caseId) });
    return { intent: i, blocks, caseId };
  };

  if (NEEDS_CASE.has(intent) && !caseId) {
    blocks.push({ type: "text", text: "Para responder isso preciso saber de qual caso você está falando. Selecione um caso acima ou cite um código (por exemplo CAS-2026-0001 ou EVD-2026-0001).", tone: "warn" });
    return done("needs-case");
  }

  if (!NEEDS_CASE.has(intent)) {
    const lib = await library();
    if (intent === "advice" || intent === "library") {
      const data = caseId ? await loadCaseData(caseId) : null;
      const found = searchLibrary(lib, message, 5);
      const contextual = data ? adviseFromLibrary(data, detectGaps(data), lib, 5) : [];
      const items = [...found, ...contextual.filter((c) => !found.some((f) => f.id === c.id))].slice(0, 6);
      if (items.length) {
        blocks.push({ type: "text", text: "Os itens abaixo vêm da biblioteca (conhecimento geral), não dos dados do caso. Cada um mostra a fonte e o motivo da sugestão.", tone: "info" });
        blocks.push({ type: "advice", items });
      } else blocks.push({ type: "text", text: "Não encontrei nada na biblioteca para essa pergunta. Tente outras palavras (ex.: hash, custódia, Autopsy, ImageJ, smartphone) ou cadastre um item na Biblioteca.", tone: "warn" });
      return done(intent);
    }
    // busca geral
    const [matches, libHits] = await Promise.all([searchRecords(message), Promise.resolve(searchLibrary(lib, message, 3))]);
    if (matches.length) blocks.push({ type: "matches", title: `Registros encontrados (${matches.length})`, items: matches });
    else blocks.push({ type: "text", text: "Não encontrei registros com esses termos.", tone: "warn" });
    if (libHits.length) blocks.push({ type: "advice", title: "Na biblioteca", items: libHits });
    return done("search");
  }

  const data = await loadCaseData(caseId!);
  if (!data) {
    blocks.push({ type: "text", text: "Caso não encontrado.", tone: "warn" });
    return { intent: "error", blocks };
  }
  const gaps = detectGaps(data);

  switch (intent) {
    case "summary":
      blocks.push(...buildSummary(data, gaps));
      break;

    case "gaps": {
      if (!gaps.length) blocks.push({ type: "text", text: "Não encontrei lacunas pelas regras do Watson. Isso não garante que o caso esteja completo: as regras só cobrem o que é verificável nos registros.", tone: "ok" });
      else blocks.push({ type: "gaps", title: `Lacunas detectadas em ${data.code} (${gaps.length})`, caseId: data.id, items: gaps });
      break;
    }

    case "next": {
      const top = gaps.slice(0, 6);
      const pending = data.tasks.filter((t) => t.status !== "CONCLUIDA");
      if (top.length) blocks.push({ type: "gaps", title: "Prioridades sugeridas (da mais grave para a menos grave)", caseId: data.id, items: top });
      if (pending.length) blocks.push({ type: "list", title: "Tarefas já cadastradas e abertas", items: pending.slice(0, 8).map((t) => ({ text: `${t.title}${t.dueDate ? ` (prazo ${new Date(t.dueDate).toLocaleDateString("pt-BR")})` : ""}` })) });
      if (!top.length && !pending.length) blocks.push({ type: "text", text: "Sem lacunas nem tarefas abertas pelas regras do Watson.", tone: "ok" });
      break;
    }

    case "trace": {
      const entities = codes.map((c) => findEntityByCode(data, c)).filter((e): e is NonNullable<typeof e> => !!e);
      if (!entities.length) {
        const cand = [...data.evidences.map((e) => e.code), ...data.findings.map((f) => f.code), ...data.analyses.map((a) => a.code)].slice(0, 6);
        blocks.push({ type: "text", text: codes.length ? `Não encontrei ${codes.join(", ")} neste caso.` : "Diga o código do item (evidência, achado, análise, dispositivo ou pessoa) para eu mostrar de onde veio e o que foi feito depois.", tone: "warn" });
        if (cand.length) blocks.push({ type: "suggestions", items: cand.map((c) => `De onde veio ${c}?`) });
        break;
      }
      for (const entity of entities.slice(0, 3)) {
        const t = traceEntity(data, entity);
        blocks.push({ type: "trace", title: t.title, origin: t.origin, after: t.after, undated: t.undated, missing: t.missing });
      }
      break;
    }

    case "timeline":
      blocks.push(buildTimeline(data));
      break;

    case "compare":
      blocks.push(...(await compareAcrossCases(data)));
      break;

    case "notes": {
      const info = extractFromNotes(data);
      blocks.push({ type: "text", text: `O diário de ${data.code} tem ${data.caseNotes.length} nota(s). Conferi hashes, IMEIs, e-mails, telefones, CPFs, códigos, tipos de mídia e ferramentas citados contra os registros.` });
      const rows = [
        ...info.unregistered.map((u) => [u.label, u.value, fmtDateTime(u.noteAt), "citado na nota, ausente dos registros"]),
        ...info.missingTypes.map((m) => ["Tipo de mídia", m.keyword, fmtDateTime(m.noteAt), `sem ${m.type} cadastrado`]),
        ...info.toolsWithoutAnalysis.map((t) => ["Ferramenta", t.tool, fmtDateTime(t.noteAt), "sem análise com essa ferramenta"])
      ];
      if (rows.length) blocks.push({ type: "table", title: "Citado nas notas e não encontrado nos registros", columns: ["Tipo", "Valor", "Nota de", "Situação"], rows });
      else blocks.push({ type: "text", text: data.caseNotes.length ? "Tudo o que identifiquei nas notas já está cadastrado." : "Ainda não há notas. Registre no Diário do perito o que fez, com qual ferramenta e o resultado.", tone: data.caseNotes.length ? "ok" : "info" });
      break;
    }

    case "draft":
      blocks.push({ type: "text", text: "Segue um rascunho organizado só com o que está registrado. Os campos [PREENCHER] precisam do seu conhecimento do caso; não preenchi nada por suposição.", tone: "info" });
      blocks.push({ type: "draft", title: `Rascunho de laudo — ${data.code}`, text: draftLaudo(data, gaps) });
      break;
  }
  return done(intent);
}

export type { Gap };
