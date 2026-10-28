// Arquivos para uso em outras ferramentas (formatos simples e documentados).
import type { CaseData } from "../case-types";
import { toCsv } from "./csv";
import { toDate } from "../text";
import { ALGORITHM_LABEL } from "../labels";
import { buildTables, type ExportMeta } from "./tables";

const fmt = (c: unknown) => (c instanceof Date ? c.toISOString() : c === null || c === undefined ? "" : String(c));

export function interopFiles(data: CaseData): { name: string; data: string }[] {
  const files: { name: string; data: string }[] = [];

  // Hashes de evidências em CSV (UTF-8) e em listas estilo md5sum/sha256sum.
  const hashRows = data.evidences.flatMap((e) => e.hashes.map((h) => [e.code, h.algorithm, h.value, toDate(h.calculatedAt)?.toISOString() ?? ""]));
  files.push({ name: "interop/evidencias-hashes.csv", data: toCsv([["evidencia", "algoritmo", "hash", "calculado_em"], ...hashRows], ",") });
  for (const [algo, file] of [["SHA256", "sha256sum-evidencias.txt"], ["SHA1", "sha1sum-evidencias.txt"], ["MD5", "md5sum-evidencias.txt"]] as const) {
    const lines = data.evidences.flatMap((e) => e.hashes.filter((h) => h.algorithm === algo).map((h) => `${h.value.toLowerCase()}  ${e.code}`));
    if (lines.length) files.push({ name: `interop/${file}`, data: lines.join("\n") + "\n" });
  }

  // Palavras-chave (um termo por linha) a partir dos envolvidos e dispositivos.
  const terms = new Set<string>();
  for (const p of data.people) [p.name, p.email, p.phone, p.document].forEach((v) => v && terms.add(v.trim()));
  for (const d of data.devices) [d.imei, d.serialNumber, d.macAddress].forEach((v) => v && terms.add(v.trim()));
  if (terms.size) files.push({ name: "interop/palavras-chave.txt", data: [...terms].join("\n") + "\n" });

  // Linha do tempo no formato com colunas datetime, timestamp_desc e message (CSV).
  const timeline = buildTables(data, [], { generatedAt: new Date(), generatedBy: "", doc: "laudo" }).find((t) => t.key === "linha-do-tempo")!;
  files.push({
    name: "interop/timeline-timesketch.csv",
    data: toCsv([["datetime", "timestamp_desc", "message", "fonte"], ...timeline.rows.map((r) => [fmt(r[0]), fmt(r[1]), fmt(r[2]), fmt(r[3])])], ",")
  });
  void ALGORITHM_LABEL;
  return files;
}

export const INTEROP_README = `PASTA interop — arquivos para outras ferramentas
=================================================

evidencias-hashes.csv       Hashes das evidencias (CSV, UTF-8, separador virgula).
sha256sum-evidencias.txt    Lista "hash  CODIGO" no formato do sha256sum. O segundo campo e o
(sha1sum-..., md5sum-...)   codigo da evidencia; para conferir arquivos reais renomeie-os com
                            o codigo ou ajuste a segunda coluna.
palavras-chave.txt          Um termo por linha (nomes, e-mails, telefones, documentos, IMEI,
                            serie, MAC). Pode ser usado como lista de palavras-chave em
                            ferramentas que aceitam texto simples (ex.: Autopsy). Confira a
                            documentacao da sua ferramenta.
timeline-timesketch.csv     Colunas datetime (ISO 8601), timestamp_desc e message, usadas para
                            importar linhas do tempo em CSV no Timesketch. Confira o formato
                            exigido pela versao que voce usa.

Estes formatos seguem convencoes comuns das ferramentas citadas, mas nao foram testados
contra cada versao delas. Valide com um caso de teste antes de usar em producao.
`;
