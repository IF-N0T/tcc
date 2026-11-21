import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({ label: z.string().trim().max(120) });

async function authorize() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (response) { return { error: response as Response }; }
  return { session };
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string; relationshipId: string } }) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Rótulo inválido." }, { status: 400 });

  const existing = await prisma.relationship.findFirst({ where: { id: params.relationshipId, caseId: params.id } });
  if (!existing) return NextResponse.json({ error: "Conexão não encontrada neste caso." }, { status: 404 });

  const updated = await prisma.relationship.update({
    where: { id: existing.id },
    data: { label: parsed.data.label || null }
  });
  await logAudit({
    userId: auth.session.sub,
    action: "ALTERACAO_RELACIONAMENTO",
    entityType: "Relationship",
    entityId: updated.id,
    details: parsed.data.label || "Rótulo removido"
  });
  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; relationshipId: string } }) {
  const auth = await authorize();
  if ("error" in auth) return auth.error;
  const existing = await prisma.relationship.findFirst({ where: { id: params.relationshipId, caseId: params.id } });
  if (!existing) return NextResponse.json({ error: "Conexão não encontrada neste caso." }, { status: 404 });

  await prisma.relationship.delete({ where: { id: existing.id } });
  await logAudit({
    userId: auth.session.sub,
    action: "EXCLUSAO_RELACIONAMENTO",
    entityType: "Relationship",
    entityId: existing.id,
    details: `${existing.sourceType}:${existing.sourceId} -> ${existing.targetType}:${existing.targetId}`
  });
  return NextResponse.json({ ok: true });
}
