import type { CaseData } from "../case-types";
import type { Gap } from "../watson/types";
import { buildXlsx, type SheetSpec, type XCellObj } from "./xlsx";
import { buildTables, summaryPairs, type ExportMeta } from "./tables";

export function caseToXlsx(data: CaseData, gaps: Gap[], meta: ExportMeta, fingerprint: string): Buffer {
  const tables = buildTables(data, gaps, meta);
  const sheets: SheetSpec[] = [{
    name: "Resumo", title: `${data.code} — ${data.name}`, subtitle: `Gerado em ${meta.generatedAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por ${meta.generatedBy}. Valores refletem o momento da exportação.`,
    headers: ["Campo", "Valor"], widths: [34, 80], landscape: false,
    rows: summaryPairs(data, meta, fingerprint).map(([k, v]) => [{ v: k, s: "label" } as XCellObj, typeof v === "string" && /^[a-f0-9]{64}$/.test(v) ? ({ v, s: "mono" } as XCellObj) : v])
  }];
  for (const t of tables) {
    sheets.push({
      name: t.name, title: t.title, subtitle: `${data.code} · ${t.rows.length} registro(s)`, headers: t.headers, widths: t.widths, filter: true,
      rows: t.rows.map((row) => row.map((cell, i): XCellObj | typeof cell => {
        if (t.mono?.includes(i)) return { v: cell as string, s: "mono" };
        if (t.severityCol === i) { const sev = String(cell).toLowerCase(); return { v: cell as string, s: sev.startsWith("alta") ? "alta" : sev.startsWith("média") ? "media" : "baixa" }; }
        if (cell instanceof Date) return { v: cell, s: "datetime" };
        return cell;
      }))
    });
  }
  return buildXlsx(sheets, { title: `${data.code} — ${data.name}`, creator: meta.generatedBy, created: meta.generatedAt });
}
