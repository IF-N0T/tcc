import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";

export async function GET() {
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: "desc" },
    include: { responsible: true, _count: { select: { evidences: true, findings: true, tasks: true } } }
  });
  return NextResponse.json(cases);
}

const createSchema = z.object({
  name: z.string().min(3, "Nome do caso deve ter ao menos 3 caracteres"),
  description: z.string().optional(),
  priority: z.enum(["BAIXA", "MEDIA", "ALTA", "CRITICA"]).default("MEDIA"),
  notes: z.string().optional()
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const code = await generateCode("CAS");
  const created = await prisma.case.create({
    data: { ...parsed.data, code, responsibleId: session.sub }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_CASO", entityType: "Case", entityId: created.id, details: created.code });

  return NextResponse.json(created, { status: 201 });
}
