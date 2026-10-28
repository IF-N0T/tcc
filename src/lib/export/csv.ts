// CSV: leitura tolerante (aspas, CRLF, delimitador detectado) e escrita segura para Excel.

export function detectDelimiter(sample: string): string {
  const lines = sample.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim()).slice(0, 8);
  if (!lines.length) return ",";
  let best = ",";
  let bestScore = -1;
  for (const candidate of [",", ";", "\t", "|"]) {
    const counts = lines.map((line) => {
      let inQuotes = false;
      let c = 0;
      for (const ch of line) {
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === candidate && !inQuotes) c++;
      }
      return c;
    });
    if (counts[0] === 0) continue;
    const consistent = counts.filter((c) => c === counts[0]).length;
    const score = consistent * 1000 + counts[0];
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

export function parseCsv(input: string, delimiter?: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const delim = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

type CsvCell = string | number | boolean | Date | null | undefined;

function safeCell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  let s = String(value);
  // Evita injeção de fórmula ao abrir no Excel/LibreOffice.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return s;
}

export function toCsv(rows: CsvCell[][], delimiter = ";", bom = true): string {
  const needsQuote = new RegExp(`[${delimiter === "\t" ? "\\t" : delimiter}"\\r\\n]`);
  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = safeCell(cell);
          return needsQuote.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(delimiter)
    )
    .join("\r\n");
  return (bom ? "\uFEFF" : "") + body + "\r\n";
}
