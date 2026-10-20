import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  caseId: z.string().min(1),
  evidenceId: z.string().min(1),
  type: z.string().trim().min(2).max(120),
  toolId: z.string().optional().or(z.literal("")),
  procedure: z.string().trim().min(3).max(10000),
  result: z.string().trim().max(20000).optional(),
  conclusion: z.string().trim().max(10000).optional()
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const [caseRecord, evidence, tool] = await Promise.all([
    prisma.case.findUnique({ where: { id: parsed.data.caseId }, select: { id: true } }),
    prisma.evidence.findUnique({ where: { id: parsed.data.evidenceId }, select: { id: true, caseId: true } }),
    parsed.data.toolId
      ? prisma.tool.findUnique({ where: { id: parsed.data.toolId }, select: { id: true } })
      : Promise.resolve(null)
  ]);

  if (!caseRecord || !evidence || evidence.caseId !== caseRecord.id) {
    return NextResponse.json({ error: "A evidência precisa pertencer ao caso selecionado." }, { status: 400 });
  }
  if (parsed.data.toolId && !tool) {
    return NextResponse.json({ error: "Ferramenta não encontrada." }, { status: 400 });
  }

  const analysis = await prisma.analysis.create({
    data: {
      code: await generateCode("ANA"),
      caseId: caseRecord.id,
      evidenceId: evidence.id,
      type: parsed.data.type,
      toolId: parsed.data.toolId || undefined,
      performedById: session.sub,
      procedure: parsed.data.procedure,
      result: parsed.data.result || undefined,
      conclusion: parsed.data.conclusion || undefined
    }
  });

  await logAudit({
    userId: session.sub,
    action: "CRIACAO_ANALISE",
    entityType: "Analysis",
    entityId: analysis.id,
    details: analysis.code
  });

  return NextResponse.json(analysis, { status: 201 });
}
