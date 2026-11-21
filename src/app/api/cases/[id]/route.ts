import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { loadCaseData } from "@/lib/case-data";
import { buildKnowledgeProposal } from "@/lib/watson/proposal";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const kase = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      responsible: true,
      people: { orderBy: { createdAt: "desc" } },
      devices: { orderBy: { createdAt: "desc" }, include: { person: true } },
      evidences: { orderBy: { createdAt: "desc" }, include: { hashes: true, custodyEvents: true, device: true } },
      findings: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" }, include: { assignedTo: true } },
      events: { orderBy: { occurredAt: "asc" } },
      relationships: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!kase) return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 });
  return NextResponse.json(kase);
}

const updateSchema = z.object({
  name: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["EM_ANALISE", "AGUARDANDO_EVIDENCIAS", "EM_ELABORACAO_LAUDO", "CONCLUIDO", "ARQUIVADO"]).optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]).optional(),
  notes: z.string().optional().nullable()
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (r) {
    return r as Response;
  }

  const existing = await prisma.case.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 });

  if (existing.status === "ARQUIVADO" || existing.status === "CONCLUIDO") {
    // Caso encerrado: alteração excepcional exige registro de auditoria explícito.
    await logAudit({
      userId: session.sub,
      action: "ALTERACAO_EM_CASO_ENCERRADO",
      entityType: "Case",
      entityId: existing.id,
      details: "Alteração excepcional realizada após encerramento do caso"
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "CONCLUIDO" || parsed.data.status === "ARQUIVADO") {
    data.closedAt = new Date();
  }

  const isNewConclusion = parsed.data.status === "CONCLUIDO" && existing.status !== "CONCLUIDO";
  let proposalDraft: ReturnType<typeof buildKnowledgeProposal> | null = null;
  if (isNewConclusion) {
    const caseData = await loadCaseData(existing.id);
    if (!caseData) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
    proposalDraft = buildKnowledgeProposal(caseData);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.case.update({ where: { id: params.id }, data });
    let proposal: { id: string; title: string } | null = null;
    if (proposalDraft) {
      const created = await tx.knowledgeProposal.createMany({
        data: { caseId: existing.id, ...proposalDraft },
        skipDuplicates: true
      });
      if (created.count > 0) {
        proposal = await tx.knowledgeProposal.findUnique({
          where: { caseId: existing.id },
          select: { id: true, title: true }
        });
      }
    }
    return { updated, proposal };
  });

  await logAudit({ userId: session.sub, action: "ALTERACAO_CASO", entityType: "Case", entityId: result.updated.id });
  if (result.proposal) {
    await logAudit({
      userId: session.sub,
      action: "GERACAO_PROPOSTA_BIBLIOTECA",
      entityType: "KnowledgeProposal",
      entityId: result.proposal.id,
      details: result.proposal.title
    });
  }

  return NextResponse.json(result.updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (r) {
    return r as Response;
  }

  const existing = await prisma.case.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.importedItem.deleteMany({ where: { caseId: params.id } });
    await tx.toolImport.deleteMany({ where: { caseId: params.id } });
    await tx.caseNote.deleteMany({ where: { caseId: params.id } });
    await tx.finding.deleteMany({ where: { caseId: params.id } });
    await tx.task.deleteMany({ where: { caseId: params.id } });
    await tx.relationship.deleteMany({ where: { caseId: params.id } });
    await tx.caseEvent.deleteMany({ where: { caseId: params.id } });
    await tx.analysis.deleteMany({ where: { caseId: params.id } });

    const evidences = await tx.evidence.findMany({ where: { caseId: params.id }, select: { id: true } });
    const evidenceIds = evidences.map((evidence) => evidence.id);
    if (evidenceIds.length > 0) {
      await tx.evidenceHash.deleteMany({ where: { evidenceId: { in: evidenceIds } } });
      await tx.custodyEvent.deleteMany({ where: { evidenceId: { in: evidenceIds } } });
      await tx.evidence.deleteMany({ where: { id: { in: evidenceIds } } });
    }

    await tx.device.deleteMany({ where: { caseId: params.id } });
    await tx.person.deleteMany({ where: { caseId: params.id } });
    await tx.case.delete({ where: { id: params.id } });
  });

  await logAudit({
    userId: session.sub,
    action: "EXCLUSAO_CASO",
    entityType: "Case",
    entityId: existing.id,
    details: `Caso ${existing.code} excluído`
  });

  return NextResponse.json({ ok: true });
}
