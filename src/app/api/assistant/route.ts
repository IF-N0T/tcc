import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const schema = z.object({ query: z.string().trim().min(2).max(240) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe uma busca de 2 a 240 caracteres." }, { status: 400 });

  const words = [...new Set(parsed.data.query.split(/\s+/).filter((word) => word.length > 1))].slice(0, 6);
  const [cases, evidences, findings, analyses, tasks] = await Promise.all([
    prisma.case.findMany({
      where: { OR: words.flatMap((word) => [{ name: { contains: word, mode: "insensitive" as const } }, { code: { contains: word, mode: "insensitive" as const } }]) },
      take: 5,
      select: { id: true, code: true, name: true, status: true, priority: true }
    }),
    prisma.evidence.findMany({
      where: { OR: words.flatMap((word) => [{ code: { contains: word, mode: "insensitive" as const } }, { description: { contains: word, mode: "insensitive" as const } }]) },
      take: 8,
      select: { id: true, code: true, description: true, case: { select: { id: true, code: true, name: true } } }
    }),
    prisma.finding.findMany({
      where: { OR: words.flatMap((word) => [{ title: { contains: word, mode: "insensitive" as const } }, { description: { contains: word, mode: "insensitive" as const } }]) },
      take: 8,
      select: { id: true, code: true, title: true, description: true, case: { select: { id: true, code: true, name: true } } }
    }),
    prisma.analysis.findMany({
      where: { OR: words.flatMap((word) => [{ code: { contains: word, mode: "insensitive" as const } }, { type: { contains: word, mode: "insensitive" as const } }, { result: { contains: word, mode: "insensitive" as const } }]) },
      take: 8,
      select: { id: true, code: true, type: true, result: true, case: { select: { id: true, code: true, name: true } } }
    }),
    prisma.task.findMany({
      where: { title: { contains: parsed.data.query, mode: "insensitive" } },
      take: 8,
      select: { id: true, title: true, status: true, case: { select: { id: true, code: true, name: true } } }
    })
  ]);

  return NextResponse.json({
    mode: "database-search",
    message: `Encontrei ${cases.length + evidences.length + findings.length + analyses.length + tasks.length} registro(s) correspondentes nos dados cadastrados. Esta busca não utiliza IA nem cria conclusões; verifique cada registro na fonte.`,
    results: [
      ...cases.map((item) => ({ id: item.id, kind: "Caso", code: item.code, title: item.name, detail: `${item.status} · prioridade ${item.priority}`, caseId: item.id, caseCode: item.code })),
      ...evidences.map((item) => ({ id: item.id, kind: "Evidência", code: item.code, title: item.description, detail: item.case.name, caseId: item.case.id, caseCode: item.case.code })),
      ...findings.map((item) => ({ id: item.id, kind: "Achado", code: item.code, title: item.title, detail: item.description, caseId: item.case.id, caseCode: item.case.code })),
      ...analyses.map((item) => ({ id: item.id, kind: "Análise", code: item.code, title: item.type, detail: item.result ?? "Sem resultado registrado", caseId: item.case.id, caseCode: item.case.code })),
      ...tasks.map((item) => ({ id: item.id, kind: "Tarefa", code: item.status, title: item.title, detail: item.case.name, caseId: item.case.id, caseCode: item.case.code }))
    ]
  });
}
