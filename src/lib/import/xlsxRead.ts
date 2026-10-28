// Leitor mínimo de .xlsx (primeira planilha) sem dependências externas.
import { readZip } from "../export/zip";

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

function textOf(fragment: string): string {
  const parts = [...fragment.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decodeXml(m[1]));
  return parts.join("");
}

function colIndex(ref: string): number {
  const letters = ref.replace(/[^A-Z]/gi, "").toUpperCase();
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

/** Converte número de série do Excel em texto ISO (apenas quando a célula tem formato de data). */
export function excelSerialToIso(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400000);
  return new Date(ms).toISOString().replace(".000Z", "Z");
}

export function readXlsxRows(buffer: Buffer): string[][] {
  const files = readZip(buffer);
  const get = (name: string) => files.get(name)?.toString("utf8");

  const workbook = get("xl/workbook.xml");
  if (!workbook) throw new Error("O arquivo não parece ser uma planilha .xlsx válida.");
  const rels = get("xl/_rels/workbook.xml.rels") ?? "";
  const firstSheet = /<sheet\b[^>]*r:id="([^"]+)"/.exec(workbook)?.[1];
  let target = "xl/worksheets/sheet1.xml";
  if (firstSheet) {
    const relTag = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((t) => t.includes(`Id="${firstSheet}"`));
    const t = relTag && /Target="([^"]+)"/.exec(relTag)?.[1];
    if (t) target = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, "");
  }
  const sheet = get(target);
  if (!sheet) throw new Error("Não foi possível localizar a primeira planilha do arquivo.");

  const sharedXml = get("xl/sharedStrings.xml") ?? "";
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));

  // Estilos de data: índices de cellXfs cujo numFmt é data.
  const stylesXml = get("xl/styles.xml") ?? "";
  const dateFmtIds = new Set<number>([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*numFmtId="(\d+)"[^>]*formatCode="([^"]*)"/g)) {
    if (/[dmyh]/i.test(m[2].replace(/\[[^\]]*\]|"[^"]*"|\\./g, ""))) dateFmtIds.add(Number(m[1]));
  }
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(stylesXml)?.[1] ?? "";
  const xfIsDate = [...cellXfs.matchAll(/<xf\b[^>]*>/g)].map((m) => {
    const id = /numFmtId="(\d+)"/.exec(m[0])?.[1];
    return id ? dateFmtIds.has(Number(id)) : false;
  });

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const body = rowMatch[1];
    if (!body) { rows.push([]); continue; }
    const cells: string[] = [];
    for (const c of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const inner = c[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const style = Number(/s="(\d+)"/.exec(attrs)?.[1] ?? -1);
      const idx = ref ? colIndex(ref) : cells.length;
      let value = "";
      if (type === "inlineStr") value = textOf(/<is\b[^>]*>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? "");
      else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        if (v !== undefined) {
          if (type === "s") value = shared[Number(v)] ?? "";
          else if (type === "b") value = v === "1" ? "true" : "false";
          else if (type === "str" || type === "e") value = decodeXml(v);
          else if (style >= 0 && xfIsDate[style] && Number.isFinite(Number(v))) value = excelSerialToIso(Number(v));
          else value = v;
        }
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = value;
    }
    rows.push(cells);
  }
  while (rows.length && rows[rows.length - 1].every((c) => !c || !c.trim())) rows.pop();
  if (rows.length > 200_000) throw new Error("A planilha tem linhas demais para importar.");
  return rows;
}
