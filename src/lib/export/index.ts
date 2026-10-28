import { createHash } from "crypto";
import type { CaseData } from "../case-types";
import type { Gap } from "../watson/types";
import { caseToHtml } from "./html";
import { caseToXlsx } from "./excel";
import { caseToTxt } from "./txt";
import { buildTables, type ExportMeta } from "./tables";
import { toCsv } from "./csv";
import { createZip } from "./zip";
import { interopFiles, INTEROP_README } from "./interop";
import { fmtDateTime, safeFilename } from "../text";

export type ExportFormat = "html" | "xlsx" | "txt" | "csv" | "json" | "zip";
export const EXPORT_FORMATS: ExportFormat[] = ["html", "xlsx", "txt", "csv", "json", "zip"];

export type ExportOptions = {
  format: ExportFormat;
  doc: "full" | "laudo";
  mode: "color" | "bw";
  section?: string;
  generatedBy: string;
  autoPrint?: boolean;
};

export type ExportResult = { body: Buffer | string; contentType: string; filename: string };

export function fingerprintOf(data: CaseData): string {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

const csvCell = (c: unknown) => (c instanceof Date ? fmtDateTime(c) : c === null || c === undefined ? "" : (c as string | number));

export function buildExport(data: CaseData, gaps: Gap[], opt: ExportOptions): ExportResult {
  const meta: ExportMeta = { generatedAt: new Date(), generatedBy: opt.generatedBy, doc: opt.doc };
  const fp = fingerprintOf(data);
  const base = safeFilename(data.code) + (opt.doc === "laudo" ? "-minuta-laudo" : "");

  switch (opt.format) {
    case "html":
      return {
        body: caseToHtml(data, gaps, meta, fp, { mode: opt.mode, autoPrint: opt.autoPrint }),
        contentType: "text/html; charset=utf-8",
        filename: `${base}-${opt.mode === "bw" ? "preto-e-branco" : "colorido"}.html`
      };
    case "xlsx":
      return { body: caseToXlsx(data, gaps, meta, fp), contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", filename: `${base}.xlsx` };
    case "txt":
      return { body: caseToTxt(data, gaps, meta, fp), contentType: "text/plain; charset=utf-8", filename: `${base}.txt` };
    case "json":
      return { body: JSON.stringify({ application: "Sherlock", exportedAt: meta.generatedAt.toISOString(), fingerprintSha256: fp, case: data }, null, 2), contentType: "application/json; charset=utf-8", filename: `${base}.json` };
    case "csv": {
      const tables = buildTables(data, gaps, { ...meta, doc: "full" });
      const t = tables.find((x) => x.key === opt.section) ?? tables.find((x) => x.key === "evidencias")!;
      return { body: toCsv([t.headers, ...t.rows.map((r) => r.map(csvCell))], ";"), contentType: "text/csv; charset=utf-8", filename: `${safeFilename(data.code)}-${t.key}.csv` };
    }
    case "zip": {
      const root = safeFilename(data.code);
      const tables = buildTables(data, gaps, { ...meta, doc: "full" });
      const files: { name: string; data: Buffer | string }[] = [
        { name: "relatorio-colorido.html", data: caseToHtml(data, gaps, { ...meta, doc: "full" }, fp, { mode: "color" }) },
        { name: "relatorio-preto-e-branco.html", data: caseToHtml(data, gaps, { ...meta, doc: "full" }, fp, { mode: "bw" }) },
        { name: "minuta-laudo.html", data: caseToHtml(data, gaps, { ...meta, doc: "laudo" }, fp, { mode: "bw" }) },
        { name: "relatorio.xlsx", data: caseToXlsx(data, gaps, { ...meta, doc: "full" }, fp) },
        { name: "relatorio.txt", data: caseToTxt(data, gaps, { ...meta, doc: "full" }, fp) },
        { name: "dados.json", data: JSON.stringify({ application: "Sherlock", fingerprintSha256: fp, case: data }, null, 2) },
        ...tables.map((t) => ({ name: `csv/${t.key}.csv`, data: toCsv([t.headers, ...t.rows.map((r) => r.map(csvCell))], ";") })),
        ...interopFiles(data),
        { name: "interop/LEIA-ME.txt", data: INTEROP_README }
      ];
      const manifest = files.map((f) => `${createHash("sha256").update(typeof f.data === "string" ? Buffer.from(f.data, "utf8") : f.data).digest("hex")}  ${f.name}`).join("\n") + "\n";
      files.push({ name: "MANIFESTO-SHA256.txt", data: manifest });
      files.push({ name: "LEIA-ME.txt", data:
        `Pacote de exportacao do caso ${data.code}\r\nGerado em ${fmtDateTime(meta.generatedAt)} por ${opt.generatedBy}\r\n\r\n` +
        `relatorio-colorido.html / relatorio-preto-e-branco.html  Relatorio completo (abrir no navegador; imprimir ou salvar em PDF).\r\n` +
        `minuta-laudo.html   Minuta com campos [PREENCHER] para o perito.\r\nrelatorio.xlsx      Planilha com uma aba por assunto.\r\nrelatorio.txt       Versao para Bloco de Notas.\r\n` +
        `dados.json          Todos os dados do caso.\r\ncsv/                Uma tabela por arquivo (separador ponto e virgula, UTF-8).\r\ninterop/            Arquivos para outras ferramentas (ver LEIA-ME dentro da pasta).\r\n` +
        `MANIFESTO-SHA256.txt  Hash de cada arquivo do pacote, para conferir a integridade.\r\n\r\nImpressao digital dos dados (SHA-256): ${fp}\r\n` +
        `Este pacote contem dados pessoais. Guarde e compartilhe com acesso restrito.\r\n` });
      return { body: createZip(files.map((f) => ({ name: `${root}/${f.name}`, data: f.data }))), contentType: "application/zip", filename: `${root}-pacote.zip` };
    }
  }
}
