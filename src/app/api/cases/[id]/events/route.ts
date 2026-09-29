import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional(),
  occurredAt: z.string()
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

  const event = await prisma.caseEvent.create({
    data: { ...parsed.data, occurredAt: new Date(parsed.data.occurredAt), caseId: params.id }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_EVENTO_TIMELINE", entityType: "CaseEvent", entityId: event.id });

  return NextResponse.json(event, { status: 201 });
}
