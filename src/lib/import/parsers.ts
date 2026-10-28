// Importadores de saídas de ferramentas forenses. Funções puras: recebem texto/linhas e
// devolvem itens normalizados + um resumo factual. Nada é inferido além do que está no arquivo.
import { parseCsv } from "../export/csv";
import { hashKindOf, normalizeHash } from "../hashes";
import { normalize } from "../text";

export type ImportSource = "autopsy-table" | "imagej-results" | "hash-list" | "sleuthkit-body" | "generic-table";

export const SOURCE_INFO: Record<ImportSource, { label: string; tool: string; accepts: string }> = {
  "autopsy-table": { label: "Autopsy — tabela de resultados (CSV/Excel)", tool: "Autopsy", accepts: ".csv, .xlsx" },
  "imagej-results": { label: "ImageJ / Fiji — tabela Results (CSV)", tool: "ImageJ", accepts: ".csv, .xlsx" },
  "hash-list": { label: "Lista de hashes (sha256sum, md5sum, PowerShell CSV)", tool: "Lista de hashes", accepts: ".txt, .csv, .sha256, .md5" },
  "sleuthkit-body": { label: "The Sleuth Kit — body file", tool: "The Sleuth Kit", accepts: ".txt, .body" },
  "generic-table": { label: "Tabela genérica (CSV/Excel)", tool: "Importação genérica", accepts: ".csv, .xlsx" }
};

export type ParsedItem = {
  name: string;
  path?: string | null;
  size?: string | null;
  md5?: string | null;
  sha1?: string | null;
  sha256?: string | null;
  mime?: string | null;
  modifiedAt?: Date | null;
  accessedAt?: Date | null;
  bornAt?: Date | null;
  extra?: Record<string, string>;
};

export type ParseResult = {
  source: ImportSource;
  rowCount: number;
  truncated: boolean;
  items: ParsedItem[];
  columns: string[];
  mapping: Record<string, string>;     // coluna do arquivo → campo do Sherlock
  unmapped: string[];
  warnings: string[];
  summary: string;                     // texto factual para registrar na análise
  sample: Record<string, string>[];
};

export const MAX_ITEMS = 20000;

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["name", "nome", "file name", "filename", "file", "arquivo", "nome do arquivo", "source file"],
  path: ["path", "caminho", "location", "localizacao", "parent path", "full path", "file path", "source path", "directory"],
  size: ["size", "tamanho", "size (bytes)", "file size", "length", "bytes", "size bytes"],
  md5: ["md5", "md5 hash", "hash md5", "md5hash"],
  sha1: ["sha1", "sha-1", "sha1 hash", "sha-1 hash", "hash sha1"],
  sha256: ["sha256", "sha-256", "sha256 hash", "sha-256 hash", "hash sha256"],
  hash: ["hash", "hash value", "valor do hash", "checksum", "digest"],
  algorithm: ["algorithm", "algoritmo", "hash algorithm"],
  mime: ["mime type", "mime", "mimetype", "content type", "tipo mime", "file type", "tipo"],
  modifiedAt: ["modified time", "modified", "date modified", "mtime", "last modified", "data de modificacao", "modificado", "modified date"],
  accessedAt: ["access time", "accessed", "date accessed", "atime", "last accessed", "acessado", "accessed date"],
  bornAt: ["created time", "created", "date created", "crtime", "birth time", "creation time", "criado", "created date", "data de criacao"]
};

function mapHeaders(headers: string[]): { mapping: Record<string, string>; unmapped: string[]; byField: Record<string, number> } {
  const mapping: Record<string, string> = {};
  const byField: Record<string, number> = {};
  headers.forEach((raw, idx) => {
    const key = normalize(raw).replace(/[_]+/g, " ");
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.includes(key) && byField[field] === undefined) {
        byField[field] = idx;
        mapping[raw] = field;
        return;
      }
    }
  });
  return { mapping, unmapped: headers.filter((h) => !(h in mapping) && h.trim() !== ""), byField };
}

export function parseDate(value: string | undefined | null): Date | null {
  const v = (value ?? "").trim();
  if (!v || v === "0" || v === "0000-00-00 00:00:00") return null;
  if (/^\d{9,11}$/.test(v)) return new Date(Number(v) * 1000);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  if (br) return new Date(Date.UTC(+br[3], +br[2] - 1, +br[1], +(br[4] ?? 0), +(br[5] ?? 0), +(br[6] ?? 0)));
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/.exec(v);
  if (iso) {
    const tz = iso[7];
    if (!tz || tz === "Z") return new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0), +(iso[6] ?? 0)));
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cleanHash(value: string | undefined, expected: "MD5" | "SHA1" | "SHA256"): string | null {
  const h = normalizeHash(value);
  return hashKindOf(h) === expected ? h : null;
}

export function tableToResult(source: ImportSource, rows: string[][]): ParseResult {
  const warnings: string[] = [];
  if (rows.length < 2) throw new Error("O arquivo precisa ter uma linha de cabeçalho e ao menos uma linha de dados.");
  const headers = rows[0].map((h) => h.trim());
  const { mapping, unmapped, byField } = mapHeaders(headers);
  const body = rows.slice(1).filter((r) => r.some((c) => c && c.trim()));
  const truncated = body.length > MAX_ITEMS;
  if (truncated) warnings.push(`O arquivo tem ${body.length} linhas; somente as primeiras ${MAX_ITEMS} foram importadas.`);

  const cell = (row: string[], field: string) => (byField[field] !== undefined ? (row[byField[field]] ?? "").trim() : "");
  if (byField.name === undefined && byField.path === undefined && byField.hash === undefined && byField.md5 === undefined && byField.sha256 === undefined && byField.sha1 === undefined) {
    warnings.push("Nenhuma coluna de nome, caminho ou hash foi reconhecida; as linhas serão guardadas com a primeira coluna como nome.");
  }

  const items: ParsedItem[] = body.slice(0, MAX_ITEMS).map((row, i) => {
    const item: ParsedItem = { name: cell(row, "name") || cell(row, "path").split(/[\\/]/).pop() || (row[0] ?? "").trim() || `linha ${i + 2}` };
    item.path = cell(row, "path") || null;
    item.size = cell(row, "size") || null;
    item.mime = cell(row, "mime") || null;
    item.md5 = cleanHash(cell(row, "md5"), "MD5");
    item.sha1 = cleanHash(cell(row, "sha1"), "SHA1");
    item.sha256 = cleanHash(cell(row, "sha256"), "SHA256");
    const generic = normalizeHash(cell(row, "hash"));
    const kind = hashKindOf(generic);
    const algo = normalize(cell(row, "algorithm")).replace(/[-\s]/g, "");
    if (kind === "MD5" && (!algo || algo === "md5")) item.md5 ||= generic;
    else if (kind === "SHA1" && (!algo || algo === "sha1")) item.sha1 ||= generic;
    else if (kind === "SHA256" && (!algo || algo === "sha256")) item.sha256 ||= generic;
    item.modifiedAt = parseDate(cell(row, "modifiedAt"));
    item.accessedAt = parseDate(cell(row, "accessedAt"));
    item.bornAt = parseDate(cell(row, "bornAt"));
    const extra: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h && !(h in mapping) && row[idx]?.trim()) extra[h] = row[idx].trim().slice(0, 500);
    });
    if (Object.keys(extra).length) item.extra = extra;
    return item;
  });

  const withHash = items.filter((i) => i.md5 || i.sha1 || i.sha256).length;
  const dates = items.flatMap((i) => [i.modifiedAt, i.bornAt, i.accessedAt]).filter((d): d is Date => !!d).map((d) => d.getTime());
  const lines = [
    `Linhas lidas: ${body.length}${truncated ? ` (importadas: ${items.length})` : ""}.`,
    `Colunas do arquivo: ${headers.filter(Boolean).join(", ")}.`,
    `Colunas reconhecidas: ${Object.entries(mapping).map(([k, v]) => `${k}→${v}`).join(", ") || "nenhuma"}.`,
    `Itens com hash: ${withHash}.`
  ];
  if (dates.length) lines.push(`Intervalo de datas nos itens: ${new Date(Math.min(...dates)).toISOString()} a ${new Date(Math.max(...dates)).toISOString()} (UTC).`);

  return {
    source, rowCount: body.length, truncated, items, columns: headers, mapping, unmapped, warnings,
    summary: lines.join("\n"),
    sample: body.slice(0, 8).map((r) => Object.fromEntries(headers.map((h, i) => [h || `coluna ${i + 1}`, r[i] ?? ""])))
  };
}

export function parseHashListText(text: string): ParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("%"));
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const line of lines) {
    const m = /^([a-fA-F0-9]{32}|[a-fA-F0-9]{40}|[a-fA-F0-9]{64})\s+[*\s]?(.+)$/.exec(line);
    if (!m) { skipped++; continue; }
    const value = m[1].toLowerCase();
    const kind = hashKindOf(value)!;
    const full = m[2].trim();
    items.push({
      name: full.split(/[\\/]/).pop() || full,
      path: /[\\/]/.test(full) ? full : null,
      md5: kind === "MD5" ? value : null,
      sha1: kind === "SHA1" ? value : null,
      sha256: kind === "SHA256" ? value : null
    });
    if (items.length >= MAX_ITEMS) { warnings.push(`Somente as primeiras ${MAX_ITEMS} linhas foram importadas.`); break; }
  }
  if (skipped) warnings.push(`${skipped} linha(s) fora do formato 'hash  arquivo' foram ignoradas.`);
  if (!items.length) throw new Error("Nenhuma linha no formato 'hash  nome-do-arquivo' foi encontrada.");
  const kinds = [...new Set(items.map((i) => (i.md5 ? "MD5" : i.sha1 ? "SHA-1" : "SHA-256")))];
  return {
    source: "hash-list", rowCount: items.length, truncated: warnings.some((w) => w.includes("primeiras")), items,
    columns: ["hash", "arquivo"], mapping: { hash: "hash", arquivo: "name" }, unmapped: [], warnings,
    summary: `Linhas lidas: ${items.length}.\nAlgoritmos encontrados: ${kinds.join(", ")}.`,
    sample: items.slice(0, 8).map((i) => ({ hash: i.sha256 ?? i.sha1 ?? i.md5 ?? "", arquivo: i.path ?? i.name }))
  };
}

export function parseBodyFile(text: string): ParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const items: ParsedItem[] = [];
  const warnings: string[] = [];
  let skipped = 0;
  for (const line of lines) {
    const f = line.split("|");
    if (f.length < 11) { skipped++; continue; }
    // Formato: MD5|nome|inode|modo|UID|GID|tamanho|atime|mtime|ctime|crtime
    const md5 = /^[a-fA-F0-9]{32}$/.test(f[0]) ? f[0].toLowerCase() : null;
    const name = f[1];
    items.push({
      name: name.split("/").pop() || name,
      path: name,
      size: f[6] || null,
      md5,
      accessedAt: parseDate(f[7]),
      modifiedAt: parseDate(f[8]),
      bornAt: parseDate(f[10]),
      extra: { inode: f[2], modo: f[3], uid: f[4], gid: f[5], ctime: f[9] }
    });
    if (items.length >= MAX_ITEMS) { warnings.push(`Somente as primeiras ${MAX_ITEMS} linhas foram importadas.`); break; }
  }
  if (skipped) warnings.push(`${skipped} linha(s) com menos de 11 campos foram ignoradas.`);
  if (!items.length) throw new Error("Nenhuma linha válida de body file (11 campos separados por |) foi encontrada.");
  const times = items.flatMap((i) => [i.modifiedAt, i.bornAt, i.accessedAt]).filter((d): d is Date => !!d).map((d) => d.getTime());
  return {
    source: "sleuthkit-body", rowCount: items.length, truncated: warnings.some((w) => w.includes("primeiras")), items,
    columns: ["MD5", "nome", "inode", "modo", "UID", "GID", "tamanho", "atime", "mtime", "ctime", "crtime"],
    mapping: { nome: "name", MD5: "md5", tamanho: "size", atime: "accessedAt", mtime: "modifiedAt", crtime: "bornAt" },
    unmapped: ["inode", "modo", "UID", "GID", "ctime"], warnings,
    summary: `Entradas lidas: ${items.length}.` + (times.length ? `\nIntervalo de datas: ${new Date(Math.min(...times)).toISOString()} a ${new Date(Math.max(...times)).toISOString()} (UTC).` : ""),
    sample: items.slice(0, 8).map((i) => ({ nome: i.path ?? i.name, tamanho: i.size ?? "", modificado: i.modifiedAt?.toISOString() ?? "" }))
  };
}

function numericStats(headers: string[], body: string[][]) {
  const out: { column: string; n: number; min: number; max: number; mean: number }[] = [];
  headers.forEach((h, idx) => {
    const nums = body.map((r) => (r[idx] ?? "").trim().replace(",", ".")).filter((v) => v !== "" && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)).map(Number);
    if (nums.length >= Math.max(1, body.length * 0.8) && h.trim()) {
      out.push({ column: h, n: nums.length, min: Math.min(...nums), max: Math.max(...nums), mean: nums.reduce((a, b) => a + b, 0) / nums.length });
    }
  });
  return out;
}

export function parseImageJResults(rows: string[][]): ParseResult {
  if (rows.length < 2) throw new Error("A tabela Results precisa de cabeçalho e ao menos uma linha de medidas.");
  const headers = rows[0].map((h) => h.trim());
  const body = rows.slice(1).filter((r) => r.some((c) => c && c.trim()));
  const stats = numericStats(headers, body);
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(/\.$/, ""));
  const lines = [
    `Medições (linhas): ${body.length}.`,
    `Colunas: ${headers.map((h) => h || "(índice)").join(", ")}.`,
    ...stats.map((s) => `${s.column}: n=${s.n}, mínimo=${fmt(s.min)}, máximo=${fmt(s.max)}, média=${fmt(s.mean)}.`)
  ];
  const items: ParsedItem[] = body.slice(0, MAX_ITEMS).map((r, i) => ({
    name: (r[headers.findIndex((h) => normalize(h) === "label")] ?? "").trim() || `Medição ${i + 1}`,
    extra: Object.fromEntries(headers.map((h, idx) => [h || "#", (r[idx] ?? "").trim()]).filter(([, v]) => v !== ""))
  }));
  return {
    source: "imagej-results", rowCount: body.length, truncated: body.length > MAX_ITEMS, items, columns: headers,
    mapping: {}, unmapped: headers.filter(Boolean),
    warnings: ["As medidas são guardadas como registradas pelo ImageJ. Confirme a calibração de escala/unidade usada na medição; o Sherlock não converte unidades."],
    summary: lines.join("\n"),
    sample: body.slice(0, 8).map((r) => Object.fromEntries(headers.map((h, i) => [h || "#", r[i] ?? ""])))
  };
}

/** Sugere o tipo de origem a partir do nome do arquivo e do conteúdo. */
export function detectSource(filename: string, text: string | null, rows: string[][] | null): ImportSource {
  if (text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim()).slice(0, 20);
    if (lines.length && lines.filter((l) => l.split("|").length >= 11).length >= Math.ceil(lines.length * 0.8)) return "sleuthkit-body";
    if (lines.length && lines.filter((l) => /^[a-fA-F0-9]{32,64}\s+[*\s]?\S/.test(l)).length >= Math.ceil(lines.length * 0.8)) return "hash-list";
  }
  const headers = (rows?.[0] ?? []).map((h) => normalize(h));
  const imagej = ["area", "mean", "min", "max", "stddev", "angle", "length", "perim.", "circ.", "feret"];
  if (headers.filter((h) => imagej.includes(h)).length >= 2) return "imagej-results";
  if (headers.some((h) => ["md5 hash", "sha-256 hash", "sha256 hash", "mime type", "modified time", "known", "data source"].includes(h))) return "autopsy-table";
  if (headers.includes("hash") && headers.includes("path")) return "hash-list";
  return "generic-table";
}

export function parseText(source: ImportSource, text: string): ParseResult {
  if (source === "hash-list") {
    const firstLine = text.replace(/^\uFEFF/, "").split(/\r?\n/).find((l) => l.trim()) ?? "";
    if (!/^[a-fA-F0-9]{32,64}\s/.test(firstLine)) return tableToResult("hash-list", parseCsv(text));
    return parseHashListText(text);
  }
  if (source === "sleuthkit-body") return parseBodyFile(text);
  const rows = parseCsv(text);
  return source === "imagej-results" ? parseImageJResults(rows) : tableToResult(source, rows);
}

export function parseRows(source: ImportSource, rows: string[][]): ParseResult {
  if (source === "imagej-results") return parseImageJResults(rows);
  if (source === "hash-list" || source === "sleuthkit-body") throw new Error("Este formato aceita apenas arquivos de texto/CSV.");
  return tableToResult(source, rows);
}
