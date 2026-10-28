import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const schema = z.object({ text: z.string().trim().min(2, "Escreva a nota.").max(5000) });

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const notes = await prisma.caseNote.findMany({ where: { caseId: params.id }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } });
  return NextResponse.json(notes);
}

// Notas são somente inserção (como hashes e custódia): não há edição nem exclusão.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (r) { return r as Response; }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const kase = await prisma.case.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!kase) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
  const note = await prisma.caseNote.create({ data: { caseId: kase.id, authorId: session.sub, text: parsed.data.text }, include: { author: { select: { name: true } } } });
  await logAudit({ userId: session.sub, action: "NOTA_DIARIO", entityType: "Case", entityId: kase.id, details: kase.code });
  return NextResponse.json(note, { status: 201 });
}
