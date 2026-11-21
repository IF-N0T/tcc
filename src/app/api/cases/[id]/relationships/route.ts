import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const ENTITY_TYPES = ["Person", "Device", "Evidence", "Finding", "CaseEvent"] as const;

const schema = z.object({
  sourceType: z.enum(ENTITY_TYPES),
  sourceId: z.string().min(1),
  targetType: z.enum(ENTITY_TYPES),
  targetId: z.string().min(1),
  label: z.string().optional()
});

async function entityBelongsToCase(caseId: string, type: typeof ENTITY_TYPES[number], entityId: string) {
  const where = { id: entityId, caseId };
  switch (type) {
    case "Person": return !!(await prisma.person.findFirst({ where, select: { id: true } }));
    case "Device": return !!(await prisma.device.findFirst({ where, select: { id: true } }));
    case "Evidence": return !!(await prisma.evidence.findFirst({ where, select: { id: true } }));
    case "Finding": return !!(await prisma.finding.findFirst({ where, select: { id: true } }));
    case "CaseEvent": return !!(await prisma.caseEvent.findFirst({ where, select: { id: true } }));
  }
}

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

  if (parsed.data.sourceType === parsed.data.targetType && parsed.data.sourceId === parsed.data.targetId) {
    return NextResponse.json({ error: "Não é possível relacionar um elemento a si mesmo" }, { status: 400 });
  }

  const [sourceExists, targetExists] = await Promise.all([
    entityBelongsToCase(params.id, parsed.data.sourceType, parsed.data.sourceId),
    entityBelongsToCase(params.id, parsed.data.targetType, parsed.data.targetId)
  ]);
  if (!sourceExists || !targetExists) {
    return NextResponse.json({ error: "Origem ou destino não pertence a este caso." }, { status: 400 });
  }

  const relationship = await prisma.relationship.create({
    data: { ...parsed.data, label: parsed.data.label?.trim() || null, caseId: params.id }
  });

  await logAudit({
    userId: session.sub,
    action: "CRIACAO_RELACIONAMENTO",
    entityType: "Relationship",
    entityId: relationship.id,
    details: `${parsed.data.sourceType}:${parsed.data.sourceId} -> ${parsed.data.targetType}:${parsed.data.targetId}`
  });

  return NextResponse.json(relationship, { status: 201 });
}
