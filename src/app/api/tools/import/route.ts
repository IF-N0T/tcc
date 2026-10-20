import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";
import { readJsonBody } from "@/lib/request";

const schema = z.object({
  toolId: z.string().min(1),
  caseId: z.string().min(1),
  rows: z.array(z.object({
    type: z.string().trim().min(2).max(120),
    evidenceId: z.string().min(1),
    procedure: z.string().trim().min(3).max(10000),
    result: z.string().trim().max(20000).optional(),
    conclusion: z.string().trim().max(10000).optional()
  })).min(1).max(100)
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const body = await readJsonBody(request, 2 * 1024 * 1024);
  if (body.error === "too-large") {
    return NextResponse.json({ error: "O arquivo de importação excede o limite de 2 MB." }, { status: 413 });
  }
  const parsed = schema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Arquivo de importação inválido." }, { status: 400 });
  }

  const [tool, evidence] = await Promise.all([
    prisma.tool.findUnique({ where: { id: parsed.data.toolId }, select: { id: true, name: true } }),
    prisma.evidence.findMany({
      where: { caseId: parsed.data.caseId, id: { in: parsed.data.rows.map((row) => row.evidenceId) } },
      select: { id: true }
    })
  ]);
  if (!tool) return NextResponse.json({ error: "Ferramenta não encontrada." }, { status: 404 });
  const availableEvidenceIds = new Set(evidence.map((item) => item.id));
  const missingEvidence = [...new Set(parsed.data.rows.filter((row) => !availableEvidenceIds.has(row.evidenceId)).map((row) => row.evidenceId))];
  if (missingEvidence.length) {
    return NextResponse.json({ error: "Uma ou mais evidências não pertencem ao caso selecionado." }, { status: 400 });
  }

  const year = new Date().getFullYear();
  const existingCount = await prisma.analysis.count({ where: { code: { startsWith: `ANA-${year}-` } } });
  const analyses = await prisma.$transaction(
    parsed.data.rows.map((row, index) => prisma.analysis.create({
      data: {
        code: `ANA-${year}-${String(existingCount + index + 1).padStart(4, "0")}`,
        caseId: parsed.data.caseId,
        evidenceId: row.evidenceId,
        type: row.type,
        toolId: tool.id,
        performedById: session.sub,
        procedure: row.procedure,
        result: row.result || undefined,
        conclusion: row.conclusion || undefined
      }
    }))
  );

  await logAudit({
    userId: session.sub,
    action: "IMPORTACAO_ANALISES",
    entityType: "Tool",
    entityId: tool.id,
    details: `${analyses.length} análise(s) importada(s) de ${tool.name}`
  });
  return NextResponse.json({ imported: analyses.length, codes: analyses.map((item) => item.code) }, { status: 201 });
}
