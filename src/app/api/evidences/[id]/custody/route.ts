import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  action: z.enum(["COLETA", "TRANSFERENCIA", "RECEBIMENTO", "DEVOLUCAO", "ARMAZENAMENTO", "PROCESSAMENTO", "OUTRO", "VERIFICACAO_HASH_CONFERE", "VERIFICACAO_HASH_DIVERGE"]),
  reason: z.string().trim().min(3).max(500)
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const evidence = await prisma.evidence.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!evidence) return NextResponse.json({ error: "Evidência não encontrada." }, { status: 404 });

  const event = await prisma.$transaction(async (tx) => {
    const previous = await tx.custodyEvent.findFirst({
      where: { evidenceId: params.id },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      select: { toCustodian: true }
    });

    // Eventos são somente-append; a correção de um registro é outro evento.
    return tx.custodyEvent.create({
      data: {
        ...parsed.data,
        evidenceId: params.id,
        fromCustodian: previous?.toCustodian ?? null,
        toCustodian: session.name,
        occurredAt: new Date(),
        registeredById: session.sub
      }
    });
  });

  await logAudit({
    userId: session.sub,
    action: "EVENTO_CUSTODIA",
    entityType: "Evidence",
    entityId: params.id,
    details: `${parsed.data.action}: ${parsed.data.reason}`
  });

  return NextResponse.json(event, { status: 201 });
}
