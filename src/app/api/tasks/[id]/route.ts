import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({ status: z.enum(["PENDENTE", "EM_ANDAMENTO", "CONCLUIDA"]) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    return NextResponse.json({ error: "Status inválido" }, { status: 400 });
  }

  const task = await prisma.task.update({ where: { id: params.id }, data: { status: parsed.data.status } });

  await logAudit({ userId: session.sub, action: "ALTERACAO_TAREFA", entityType: "Task", entityId: task.id, details: parsed.data.status });

  return NextResponse.json(task);
}
