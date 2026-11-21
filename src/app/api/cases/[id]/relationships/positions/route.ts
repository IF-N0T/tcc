import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";

const ENTITY_TYPES = ["Person", "Device", "Evidence", "Finding", "CaseEvent"] as const;
const schema = z.object({
  positions: z.array(z.object({
    entityType: z.enum(ENTITY_TYPES),
    entityId: z.string().min(1),
    x: z.number().finite().min(-10000).max(10000),
    y: z.number().finite().min(-10000).max(10000)
  })).min(1).max(300)
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (response) { return response as Response; }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Posições inválidas." }, { status: 400 });

  const unique = new Set(parsed.data.positions.map((position) => `${position.entityType}:${position.entityId}`));
  if (unique.size !== parsed.data.positions.length) {
    return NextResponse.json({ error: "Há itens duplicados na atualização de posições." }, { status: 400 });
  }

  const exists = await Promise.all(parsed.data.positions.map(async (position) => {
    const where = { id: position.entityId, caseId: params.id };
    switch (position.entityType) {
      case "Person": return !!(await prisma.person.findFirst({ where, select: { id: true } }));
      case "Device": return !!(await prisma.device.findFirst({ where, select: { id: true } }));
      case "Evidence": return !!(await prisma.evidence.findFirst({ where, select: { id: true } }));
      case "Finding": return !!(await prisma.finding.findFirst({ where, select: { id: true } }));
      case "CaseEvent": return !!(await prisma.caseEvent.findFirst({ where, select: { id: true } }));
    }
  }));
  if (exists.some((item) => !item)) {
    return NextResponse.json({ error: "Um ou mais itens não pertencem a este caso." }, { status: 400 });
  }

  await prisma.$transaction(parsed.data.positions.map((position) => prisma.relationshipNodePosition.upsert({
    where: {
      caseId_entityType_entityId: {
        caseId: params.id,
        entityType: position.entityType,
        entityId: position.entityId
      }
    },
    create: { ...position, caseId: params.id },
    update: { x: position.x, y: position.y }
  })));
  return NextResponse.json({ saved: parsed.data.positions.length });
}
