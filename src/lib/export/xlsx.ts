// Gerador de planilhas .xlsx sem dependências externas.
// Produz planilhas com cabeçalho estilizado, congelamento de painel, filtro,
// larguras de coluna, formatos de data e configuração de impressão (A4, paisagem).
import { createZip } from "./zip";

export type XCell = string | number | boolean | Date | null | undefined;
export type XStyle =
  | "default" | "header" | "title" | "muted" | "mono" | "date" | "datetime"
  | "alta" | "media" | "baixa" | "ok" | "label" | "number";
export type XCellObj = { v: XCell; s?: XStyle };

export type SheetSpec = {
  name: string;
  title?: string;
  subtitle?: string;
  headers?: string[];
  rows: (XCell | XCellObj)[][];
  widths?: number[];
  filter?: boolean;
  landscape?: boolean;
};

const STYLE_INDEX: Record<XStyle, number> = {
  default: 0, header: 1, title: 2, muted: 3, mono: 4, date: 5, datetime: 6,
  alta: 7, media: 8, baixa: 9, ok: 10, label: 11, number: 12
};

const MAX_CELL = 32000;

function xmlEscape(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function colName(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const SP_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", hourCycle: "h23",
  year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
});

/** Converte uma data para o número de série do Excel usando o horário de Brasília. */
function excelSerial(date: Date): number {
  const p = Object.fromEntries(SP_PARTS.formatToParts(date).map((x) => [x.type, x.value]));
  const ms = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return ms / 86400000 + 25569;
}

function uniqueSheetName(raw: string, used: Set<string>): string {
  let base = raw.replace(/[\[\]:*?\/\\]/g, " ").trim().slice(0, 31) || "Planilha";
  let name = base;
  let i = 2;
  while (used.has(name.toLowerCase())) {
    const suffix = ` (${i++})`;
    name = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(name.toLowerCase());
  return name;
}

function cellXml(ref: string, input: XCell | XCellObj, defaultStyle: XStyle): string {
  let value: XCell;
  let style: XStyle = defaultStyle;
  if (input !== null && typeof input === "object" && !(input instanceof Date) && "v" in input) {
    value = input.v;
    style = input.s ?? defaultStyle;
  } else {
    value = input as XCell;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return `<c r="${ref}" s="${STYLE_INDEX.default}"/>`;
    const s = style === "default" ? "datetime" : style;
    return `<c r="${ref}" s="${STYLE_INDEX[s]}"><v>${excelSerial(value)}</v></c>`;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const s = style === "default" ? "number" : style;
    return `<c r="${ref}" s="${STYLE_INDEX[s]}"><v>${value}</v></c>`;
  }
  if (typeof value === "boolean") {
    return `<c r="${ref}" s="${STYLE_INDEX[style]}" t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  if (value === null || value === undefined || value === "") {
    return `<c r="${ref}" s="${STYLE_INDEX[style]}"/>`;
  }
  let text = String(value);
  if (text.length > MAX_CELL) text = text.slice(0, MAX_CELL) + "… [texto truncado]";
  return `<c r="${ref}" s="${STYLE_INDEX[style]}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(text)}</t></is></c>`;
}

function sheetXml(spec: SheetSpec, first: boolean): { xml: string; headerRow: number; lastRow: number; cols: number } {
  const headers = spec.headers ?? [];
  const cols = Math.max(headers.length, ...spec.rows.map((r) => r.length), 1);
  const rowsXml: string[] = [];
  let r = 0;

  if (spec.title) {
    r++;
    rowsXml.push(`<row r="${r}" ht="24" customHeight="1">${cellXml(`A${r}`, spec.title, "title")}</row>`);
    if (spec.subtitle) {
      r++;
      rowsXml.push(`<row r="${r}">${cellXml(`A${r}`, spec.subtitle, "muted")}</row>`);
    }
    r++; // linha em branco
  }

  let headerRow = 0;
  if (headers.length) {
    r++;
    headerRow = r;
    const cells = headers.map((h, i) => cellXml(`${colName(i)}${r}`, h, "header")).join("");
    rowsXml.push(`<row r="${r}" ht="22" customHeight="1">${cells}</row>`);
  }

  for (const row of spec.rows) {
    r++;
    const cells: string[] = [];
    for (let c = 0; c < cols; c++) cells.push(cellXml(`${colName(c)}${r}`, row[c], "default"));
    rowsXml.push(`<row r="${r}">${cells.join("")}</row>`);
  }
  const lastRow = Math.max(r, 1);

  const widths = spec.widths ?? [];
  const colsXml = Array.from({ length: cols }, (_, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${widths[i] ?? 18}" customWidth="1"/>`
  ).join("");

  const frozenRow = headerRow || (spec.title ? (spec.subtitle ? 3 : 2) : 0);
  const pane = frozenRow
    ? `<pane ySplit="${frozenRow}" topLeftCell="A${frozenRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${frozenRow + 1}" sqref="A${frozenRow + 1}"/>`
    : "";
  const autoFilter = spec.filter && headerRow && spec.rows.length
    ? `<autoFilter ref="A${headerRow}:${colName(cols - 1)}${lastRow}"/>`
    : "";
  const orientation = spec.landscape === false ? "portrait" : "landscape";

  const xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>` +
    `<dimension ref="A1:${colName(cols - 1)}${lastRow}"/>` +
    `<sheetViews><sheetView workbookViewId="0" showGridLines="0"${first ? ' tabSelected="1"' : ""}>${pane}</sheetView></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    `<cols>${colsXml}</cols>` +
    `<sheetData>${rowsXml.join("")}</sheetData>` +
    autoFilter +
    `<pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
    `<pageSetup paperSize="9" orientation="${orientation}" fitToWidth="1" fitToHeight="0"/>` +
    `<headerFooter><oddFooter>&amp;L&amp;A&amp;RPágina &amp;P de &amp;N</oddFooter></headerFooter>` +
    `</worksheet>`;
  return { xml, headerRow, lastRow, cols };
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/></numFmts>
<fonts count="6">
<font><sz val="10"/><color rgb="FF1F2937"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/><family val="2"/></font>
<font><b/><sz val="15"/><color rgb="FF1F2937"/><name val="Arial"/><family val="2"/></font>
<font><i/><sz val="9"/><color rgb="FF6B7280"/><name val="Arial"/><family val="2"/></font>
<font><sz val="9"/><color rgb="FF1F2937"/><name val="Consolas"/><family val="3"/></font>
<font><b/><sz val="10"/><color rgb="FF1F2937"/><name val="Arial"/><family val="2"/></font>
</fonts>
<fills count="8">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F2937"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFDE2E2"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFEF3C7"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE5E7EB"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFD1FAE5"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="13">
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function buildXlsx(
  sheets: SheetSpec[],
  meta: { title: string; creator: string; created?: Date }
): Buffer {
  const used = new Set<string>();
  const built = sheets.map((spec, i) => {
    const name = uniqueSheetName(spec.name, used);
    return { name, ...sheetXml(spec, i === 0) };
  });

  const definedNames: string[] = [];
  built.forEach((s, i) => {
    const q = `'${s.name.replace(/'/g, "''")}'`;
    if (s.headerRow) {
      definedNames.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${xmlEscape(q)}!$${s.headerRow}:$${s.headerRow}</definedName>`);
    }
  });

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000"/></bookViews>` +
    `<sheets>${built.map((s, i) => `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
    (definedNames.length ? `<definedNames>${definedNames.join("")}</definedNames>` : "") +
    `</workbook>`;

  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    built.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rId${built.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    built.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
    `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
    `</Relationships>`;

  const created = (meta.created ?? new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const core =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
    `<dc:title>${xmlEscape(meta.title)}</dc:title><dc:creator>${xmlEscape(meta.creator)}</dc:creator>` +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created></cp:coreProperties>`;
  const app =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Sherlock</Application></Properties>`;

  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "docProps/core.xml", data: core },
    { name: "docProps/app.xml", data: app },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: rels },
    { name: "xl/styles.xml", data: STYLES_XML },
    ...built.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml }))
  ]);
}
