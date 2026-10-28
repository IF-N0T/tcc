import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { readJsonBody } from "@/lib/request";
import { logAudit } from "@/lib/audit";
import { generateCode } from "@/lib/ids";
import { hashKindOf } from "@/lib/hashes";
import { detectSource, parseRows, parseText, SOURCE_INFO, type ImportSource, type ParseResult } from "@/lib/import/parsers";
import { parseCsv } from "@/lib/export/csv";
import { readXlsxRows } from "@/lib/import/xlsxRead";

export const dynamic = "force-dynamic";
const MAX_BYTES = 14 * 1024 * 1024;
const SOURCES = ["auto", "autopsy-table", "imagej-results", "hash-list", "sleuthkit-body", "generic-table"] as const;

const schema = z.object({
  mode: z.enum(["preview", "commit"]),
  caseId: z.string().optional(),
  evidenceId: z.string().optional(),
  source: z.enum(SOURCES),
  filename: z.string().trim().min(1).max(200),
  encoding: z.enum(["text", "base64"]),
  content: z.string().min(1),
  toolName: z.string().trim().max(120).optional(),
  registerAsEvidenceHash: z.boolean().optional()
});

function parseContent(input: z.infer<typeof schema>): { result: ParseResult; detected: ImportSource } {
  const isXlsx = input.encoding === "base64" || /\.xlsx$/i.test(input.filename);
  let rows: string[][] | null = null;
  let text: string | null = null;
  if (isXlsx) rows = readXlsxRows(Buffer.from(input.content, "base64"));
  else { text = input.content; }
  const detected = input.source === "auto" ? detectSource(input.filename, text, rows ?? parseCsvSafe(text)) : (input.source as ImportSource);
  const result = rows ? parseRows(detected, rows) : parseText(detected, text!);
  return { result, detected };
}
function parseCsvSafe(text: string | null) { try { return text ? parseCsv(text) : null; } catch { return null; } }

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (r) { return r as Response; }

  const body = await readJsonBody(request, MAX_BYTES);
  if (body.error === "too-large") return NextResponse.json({ error: "O arquivo excede o limite de cerca de 8 MB." }, { status: 413 });
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados de importação inválidos." }, { status: 400 });
  const input = parsed.data;

  let parsedFile: { result: ParseResult; detected: ImportSource };
  try { parsedFile = parseContent(input); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível ler o arquivo." }, { status: 400 }); }
  const { result, detected } = parsedFile;
  const info = SOURCE_INFO[detected];

  if (input.mode === "preview") {
    return NextResponse.json({
      detected, label: info.label, tool: info.tool, rowCount: result.rowCount, truncated: result.truncated,
      columns: result.columns, mapping: result.mapping, unmapped: result.unmapped, warnings: result.warnings,
      summary: result.summary, sample: result.sample,
      singleHash: result.items.length === 1 ? (result.items[0].sha256 ?? result.items[0].sha1 ?? result.items[0].md5 ?? null) : null
    });
  }

  if (!input.caseId || !input.evidenceId) return NextResponse.json({ error: "Selecione o caso e a evidência a que o arquivo se refere." }, { status: 400 });
  const caseId = input.caseId;
  const evidence = await prisma.evidence.findFirst({ where: { id: input.evidenceId, caseId }, select: { id: true, code: true } });
  if (!evidence) return NextResponse.json({ error: "A evidência precisa pertencer ao caso selecionado." }, { status: 400 });

  const toolName = (input.toolName || info.tool).trim();
  let tool = await prisma.tool.findFirst({ where: { name: { equals: toolName, mode: "insensitive" } } });
  if (!tool) tool = await prisma.tool.create({ data: { name: toolName } });

  const now = new Date();
  const analysis = await prisma.analysis.create({
    data: {
      code: await generateCode("ANA"), caseId, evidenceId: evidence.id,
      type: `Importação de ${info.tool}`, toolId: tool.id, performedById: session.sub,
      procedure: `Arquivo "${input.filename}" (${info.label}) importado em ${now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} por ${session.name}. Os dados foram lidos como registrados pelo arquivo; nenhuma interpretação foi acrescentada.`,
      result: result.summary.slice(0, 19000)
    }
  });

  const imp = await prisma.toolImport.create({
    data: { caseId, evidenceId: evidence.id, toolId: tool.id, analysisId: analysis.id, source: detected, filename: input.filename, rowCount: result.items.length, summary: result.summary, importedById: session.sub }
  });

  for (let i = 0; i < result.items.length; i += 1000) {
    await prisma.importedItem.createMany({
      data: result.items.slice(i, i + 1000).map((it) => ({
        importId: imp.id, caseId, evidenceId: evidence.id, name: it.name.slice(0, 500), path: it.path?.slice(0, 2000) ?? null,
        size: it.size ?? null, md5: it.md5 ?? null, sha1: it.sha1 ?? null, sha256: it.sha256 ?? null, mime: it.mime?.slice(0, 200) ?? null,
        modifiedAt: it.modifiedAt ?? null, accessedAt: it.accessedAt ?? null, bornAt: it.bornAt ?? null,
        extra: it.extra ? JSON.stringify(it.extra).slice(0, 8000) : null
      }))
    });
  }

  let hashRegistered: string | null = null;
  if (input.registerAsEvidenceHash && result.items.length === 1) {
    const value = result.items[0].sha256 ?? result.items[0].sha1 ?? result.items[0].md5;
    const kind = hashKindOf(value);
    if (value && kind) {
      await prisma.evidenceHash.create({ data: { evidenceId: evidence.id, algorithm: kind, value, calculatedById: session.sub, notes: `Importado de ${input.filename}` } });
      hashRegistered = `${kind}: ${value}`;
    }
  }

  await logAudit({ userId: session.sub, action: "IMPORTACAO_FERRAMENTA", entityType: "ToolImport", entityId: imp.id, details: `${info.tool} · ${input.filename} · ${result.items.length} linha(s) · ${evidence.code}` });
  return NextResponse.json({ importId: imp.id, analysisCode: analysis.code, imported: result.items.length, hashRegistered, warnings: result.warnings }, { status: 201 });
}
