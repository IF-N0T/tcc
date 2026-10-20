import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  vendor: z.string().trim().max(120).optional(),
  version: z.string().trim().max(60).optional()
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

  const tool = await prisma.tool.create({
    data: { name: parsed.data.name, vendor: parsed.data.vendor || null, version: parsed.data.version || null }
  });
  await logAudit({
    userId: session.sub,
    action: "CADASTRO_FERRAMENTA",
    entityType: "Tool",
    entityId: tool.id,
    details: tool.name
  });

  return NextResponse.json(tool, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Identificador da ferramenta obrigatório." }, { status: 400 });
  const tool = await prisma.tool.findUnique({ where: { id }, include: { _count: { select: { analyses: true } } } });
  if (!tool) return NextResponse.json({ error: "Ferramenta não encontrada." }, { status: 404 });
  if (tool._count.analyses > 0) {
    return NextResponse.json({ error: "Ferramentas vinculadas a análises não podem ser excluídas." }, { status: 409 });
  }

  await prisma.tool.delete({ where: { id } });
  await logAudit({
    userId: session.sub,
    action: "EXCLUSAO_FERRAMENTA",
    entityType: "Tool",
    entityId: tool.id,
    details: tool.name
  });
  return NextResponse.json({ ok: true });
}
