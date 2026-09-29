import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(3),
  dueDate: z.string().optional()
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

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      caseId: params.id,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined
    }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_TAREFA", entityType: "Task", entityId: task.id, details: task.title });

  return NextResponse.json(task, { status: 201 });
}
