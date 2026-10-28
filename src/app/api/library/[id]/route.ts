import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.enum(["PROCEDIMENTO", "FERRAMENTA", "CHECKLIST", "NORMA", "ALERTA", "GLOSSARIO", "MODELO_TEXTO"]),
  summary: z.string().trim().min(3).max(300),
  content: z.string().trim().min(3).max(20000),
  tags: z.string().trim().max(300).optional().default(""),
  appliesTo: z.string().trim().max(300).optional().default(""),
  source: z.string().trim().max(300).optional().nullable()
});

async function guard(id: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (r) { return { error: r as Response }; }
  const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
  if (!entry) return { error: NextResponse.json({ error: "Item não encontrado." }, { status: 404 }) };
  if (entry.builtIn && session.role !== "ADMIN") return { error: NextResponse.json({ error: "Itens padrão só podem ser alterados por administradores." }, { status: 403 }) };
  if (!entry.builtIn && session.role !== "ADMIN" && entry.authorId !== session.sub) return { error: NextResponse.json({ error: "Você só pode alterar itens criados por você." }, { status: 403 }) };
  return { session, entry };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(params.id);
  if ("error" in g) return g.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const updated = await prisma.knowledgeEntry.update({ where: { id: params.id }, data: { ...parsed.data, source: parsed.data.source || null } });
  await logAudit({ userId: g.session!.sub, action: "ALTERACAO_ITEM_BIBLIOTECA", entityType: "KnowledgeEntry", entityId: params.id, details: updated.title });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const g = await guard(params.id);
  if ("error" in g) return g.error;
  if (g.entry!.builtIn) return NextResponse.json({ error: "Itens padrão da biblioteca não podem ser excluídos." }, { status: 409 });
  await prisma.knowledgeEntry.delete({ where: { id: params.id } });
  await logAudit({ userId: g.session!.sub, action: "EXCLUSAO_ITEM_BIBLIOTECA", entityType: "KnowledgeEntry", entityId: params.id, details: g.entry!.title });
  return NextResponse.json({ ok: true });
}
