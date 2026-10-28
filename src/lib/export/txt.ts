// Versão para Bloco de Notas: texto puro, UTF-8 com BOM, quebras CRLF, 80 colunas, molduras em ASCII.
import type { CaseData } from "../case-types";
import type { Gap } from "../watson/types";
import { buildTables, summaryPairs, type ExportMeta, type Cell } from "./tables";
import { wrapText, fmtDateTime } from "../text";
import { draftLaudo } from "../watson/draft";

const W = 80;
const ascii = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const fmtCell = (c: Cell) => (c instanceof Date ? fmtDateTime(c) : c === null || c === "" ? "-" : String(c));

function box(title: string): string[] {
  return ["=".repeat(W), ` ${title.toUpperCase()}`, "=".repeat(W)];
}

export function caseToTxt(data: CaseData, gaps: Gap[], meta: ExportMeta, fingerprint: string): string {
  const L: string[] = [];
  L.push(...box(`Sherlock - ${meta.doc === "laudo" ? "Minuta de laudo" : "Relatorio do caso"}`));
  L.push("");
  for (const [k, v] of summaryPairs(data, meta, fingerprint)) {
    const value = fmtCell(v as Cell);
    const lines = wrapText(value, W - 38);
    L.push(`${(k + ":").padEnd(38)}${lines[0] ?? "-"}`);
    for (const extra of lines.slice(1)) L.push(" ".repeat(38) + extra);
  }
  L.push("");

  if (meta.doc === "laudo") {
    L.push(...box("Minuta"));
    L.push("");
    for (const line of draftLaudo(data, gaps).split("\n")) L.push(...(line.trim() === "" ? [""] : wrapText(line, W - 2).map((l, i) => (i === 0 ? l : "  " + l))));
  } else {
    let n = 0;
    for (const t of buildTables(data, gaps, meta)) {
      n++;
      L.push("", ...box(ascii(`${n}. ${t.title} (${t.rows.length})`)));
      if (!t.rows.length) { L.push("  (nenhum registro)"); continue; }
      t.rows.forEach((row, idx) => {
        L.push("", `  [${idx + 1}] ${fmtCell(row[0])}`);
        row.forEach((cell, i) => {
          if (i === 0) return;
          const text = fmtCell(cell);
          if (text === "-") return;
          const label = `${t.headers[i]}: `;
          const indent = 4 + label.length;
          const lines = wrapText(text, Math.max(30, W - indent));
          L.push(`    ${label}${lines[0] ?? ""}`);
          for (const extra of lines.slice(1)) L.push(" ".repeat(indent) + extra);
        });
      });
    }
  }
  L.push("", "-".repeat(W), "Fim do documento. Gerado pelo Sherlock; confira os dados nas fontes originais.", `Impressao digital (SHA-256) dos dados: ${fingerprint}`);
  return "\uFEFF" + L.join("\r\n") + "\r\n";
}
