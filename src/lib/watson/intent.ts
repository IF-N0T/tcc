import { normalize } from "../text";

export type Intent =
  | "trace" | "gaps" | "summary" | "compare" | "advice" | "draft" | "timeline" | "notes" | "library" | "next" | "search";

export const CODE_RE = /\b(?:CAS|EVD|DEV|PES|ANA|ACH)-\d{4}-\d{4}\b/gi;

export function classify(message: string): { intent: Intent; codes: string[] } {
  const codes = [...message.matchAll(CODE_RE)].map((m) => m[0].toUpperCase());
  const m = normalize(message);
  const has = (re: RegExp) => re.test(m);

  if (has(/proximo[s]? passo|o que (fazer|falta fazer)|por onde (comeco|continuo)|prioridad/)) return { intent: "next", codes };
  if (codes.length && has(/de onde|origem|veio|vem |obt|pegou|peg(ou|aram)|como (foi|surgiu|chegou)|depois|seguiu|historic|procedenc|rastre|o que (foi )?feito|ficha|detalh/)) return { intent: "trace", codes };
  if (has(/rascunho|minuta|esboc|laudo|redigir|escrever o relatorio/)) return { intent: "draft", codes };
  if (has(/lacun|falt(a|am|ando)|pendenc|incomplet|inconsist|incoerenc|verific(ar|a) (o )?caso|problema|erro/)) return { intent: "gaps", codes };
  if (has(/compar|outros casos|outro caso|duplic|coincid|mesmo hash|cruz|em comum|aparece em/)) return { intent: "compare", codes };
  if (has(/linha do tempo|cronolog|timeline|sequencia de eventos/)) return { intent: "timeline", codes };
  if (has(/\bnota|diario|anotac|o que (eu )?escrevi/)) return { intent: "notes", codes };
  if (has(/conselho|aconselh|dica|boas praticas|recomend|sugest|devo|como (fazer|proceder|registrar|coletar)|o que (e|significa)|norma|procedimento/)) return { intent: "advice", codes };
  if (has(/resum|visao geral|panorama|situacao|status do caso|me fale do caso|explique o caso/)) return { intent: "summary", codes };
  if (has(/biblioteca|guia|autopsy|imagej|ftk|sleuth|hash|imei|cadeia|custodia|exif|e-?mail|metadado/)) return { intent: "library", codes };
  if (codes.length) return { intent: "trace", codes };
  return { intent: "search", codes };
}
