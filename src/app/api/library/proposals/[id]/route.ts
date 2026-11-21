import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { safeFilename } from "@/lib/text";

const schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN"]); } catch (r) { return r as Response; }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ação inválida." }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const proposal = await tx.knowledgeProposal.findUnique({ where: { id: params.id } });
    if (!proposal) return null;
    const claimed = await tx.knowledgeProposal.updateMany({
      where: { id: proposal.id, status: "PENDING" },
      data: {
        status: parsed.data.action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewerId: session.sub
      }
    });
    if (claimed.count === 0) return { conflict: true as const };

    const entry = parsed.data.action === "approve"
      ? await tx.knowledgeEntry.create({
          data: {
            slug: `proposta-${safeFilename(proposal.id)}`,
            title: proposal.title,
            category: "CHECKLIST",
            summary: proposal.summary,
            content: proposal.content,
            tags: proposal.tags,
            appliesTo: proposal.appliesTo,
            source: "Proposta anonimizada gerada a partir de padrões de revisão; valide antes de aplicar.",
            builtIn: false,
            authorId: session.sub
          }
        })
      : null;

    const updated = await tx.knowledgeProposal.update({
      where: { id: proposal.id },
      data: { libraryEntryId: entry?.id ?? null },
      select: { id: true, title: true, status: true }
    });
    return { proposal: updated, entry };
  });

  if (!result) return NextResponse.json({ error: "Proposta não encontrada." }, { status: 404 });
  if ("conflict" in result) return NextResponse.json({ error: "Esta proposta já foi revisada." }, { status: 409 });

  await logAudit({
    userId: session.sub,
    action: parsed.data.action === "approve" ? "APROVACAO_PROPOSTA_BIBLIOTECA" : "REJEICAO_PROPOSTA_BIBLIOTECA",
    entityType: "KnowledgeProposal",
    entityId: result.proposal.id,
    details: result.proposal.title
  });
  return NextResponse.json(result);
}
