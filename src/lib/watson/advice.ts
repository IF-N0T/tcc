// Seleção de itens da biblioteca relevantes ao contexto do caso. Cada conselho informa o motivo.
import type { CaseData } from "../case-types";
import type { Gap } from "./types";

export type LibEntry = {
  id: string; slug: string; title: string; category: string; summary: string; content: string;
  tags: string; appliesTo: string; source: string | null;
};

export function adviseFromLibrary(data: CaseData, gaps: Gap[], library: LibEntry[], limit = 8) {
  const triggers = new Map<string, string>(); // gatilho (minúsculo) → motivo legível
  const set = (k: string, why: string) => { const key = k.toLowerCase(); if (!triggers.has(key)) triggers.set(key, why); };

  for (const e of data.evidences) {
    set(e.type, `há evidência do tipo ${e.type} (${e.code})`);
    set(e.category, `há evidência ${e.category === "DIGITAL" ? "digital" : "física"} (${e.code})`);
  }
  for (const d of data.devices) set(d.type, `há dispositivo do tipo ${d.type} (${d.code})`);
  for (const a of data.analyses) if (a.tool?.name) set(a.tool.name, `a análise ${a.code} usa ${a.tool.name}`);
  for (const i of data.imports) if (i.tool?.name) set(i.tool.name, `há importação de ${i.tool.name}`);
  for (const g of gaps) set(g.code, `lacuna detectada: ${g.title}`);
  set(data.status, `o caso está em "${data.status}"`);
  if (data.status === "EM_ELABORACAO_LAUDO") set("LAUDO", "o caso está em elaboração de laudo");
  if (data.caseNotes.length) set("NOTES", "o caso tem notas no diário");
  if (data.imports.length) set("COMPARE", "há itens importados que podem ser comparados");

  const sevWeight: Record<string, number> = { alta: 3, media: 2, baixa: 1, info: 0 };
  const scored = library.map((entry) => {
    const applies = entry.appliesTo.split(",").map((s) => s.trim()).filter(Boolean);
    let score = 0;
    const reasons: string[] = [];
    for (const a of applies) {
      if (a === "*") { score += 0.2; continue; }
      const why = triggers.get(a.toLowerCase());
      if (why) {
        const gap = gaps.find((g) => g.code === a);
        score += 2 + (gap ? sevWeight[gap.severity] : 0);
        reasons.push(why);
      }
    }
    if (entry.category === "GLOSSARIO" || entry.category === "MODELO_TEXTO") score *= 0.8;
    return { entry, score, reasons: [...new Set(reasons)] };
  }).filter((s) => s.reasons.length > 0).sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ entry, reasons }) => ({
    id: entry.id, title: entry.title, category: entry.category, summary: entry.summary, content: entry.content,
    source: entry.source, reason: `Sugerido porque ${reasons.slice(0, 3).join("; ")}.`
  }));
}

const STOP = new Set(["como", "para", "usar", "uso", "qual", "quais", "que", "com", "uma", "uns", "sobre", "fazer", "isso", "esse", "essa", "das", "dos", "nos", "nas", "por", "mais", "meu", "minha", "tem", "ter", "sao", "foi", "ser", "voce"]);

export function searchLibrary(library: LibEntry[], query: string, limit = 6) {
  const words = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9-]+/).filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return [];
  return library.map((e) => {
    const hay = `${e.title} ${e.tags} ${e.summary} ${e.content}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const titleHay = `${e.title} ${e.tags}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    let score = 0;
    for (const w of words) { if (titleHay.includes(w)) score += 3; if (hay.includes(w)) score += 1; }
    return { e, score };
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ e }) => ({
    id: e.id, title: e.title, category: e.category, summary: e.summary, content: e.content, source: e.source,
    reason: "Encontrado na biblioteca pela sua pergunta."
  }));
}
