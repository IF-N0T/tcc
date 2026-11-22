import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const schema = z.object({
  caseId: z.string().min(1),
  tab: z.enum([
    "overview",
    "people",
    "evidence",
    "analyses",
    "relationships",
    "timeline",
    "findings",
    "tasks",
    "notes",
    "watson"
  ])
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Caso ou seção inválidos." }, { status: 400 });
  }

  const kase = await prisma.case.findUnique({ where: { id: parsed.data.caseId }, select: { id: true } });
  if (!kase) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  await prisma.caseVisit.upsert({
    where: { userId_caseId: { userId: session.sub, caseId: kase.id } },
    update: { lastTab: parsed.data.tab, lastVisitedAt: new Date() },
    create: { userId: session.sub, caseId: kase.id, lastTab: parsed.data.tab }
  });

  return NextResponse.json({ ok: true });
}
