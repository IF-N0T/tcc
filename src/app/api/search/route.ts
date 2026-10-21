import { NextRequest, NextResponse } from "next/server";
import type { CasePriority, CaseStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const priorityParam = req.nextUrl.searchParams.get("priority");
  const statusParam = req.nextUrl.searchParams.get("status");
  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const priorities: CasePriority[] = ["BAIXA", "MEDIA", "ALTA", "CRITICA"];
  const statuses: CaseStatus[] = ["EM_ANALISE", "AGUARDANDO_EVIDENCIAS", "EM_ELABORACAO_LAUDO", "CONCLUIDO", "ARQUIVADO"];

  if (q && (q.length < 2 || q.length > 240)) {
    return NextResponse.json({ error: "A busca deve ter entre 2 e 240 caracteres." }, { status: 400 });
  }
  if (priorityParam && !priorities.includes(priorityParam as CasePriority)) {
    return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  }
  if (statusParam && !statuses.includes(statusParam as CaseStatus)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  const parseDate = (value: string | null, endOfDay: boolean): Date | undefined | null => {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
  };
  const from = parseDate(fromParam, false);
  const to = parseDate(toParam, true);
  if (
    from === null ||
    to === null ||
    (from && to && from > to)
  ) {
    return NextResponse.json({ error: "Informe um intervalo de datas válido." }, { status: 400 });
  }

  if (!q && !priorityParam && !statusParam && !from && !to) {
    return NextResponse.json({ query: q ?? "", results: [] });
  }

  const caseFilter: Prisma.CaseWhereInput = {
    ...(priorityParam ? { priority: priorityParam as CasePriority } : {}),
    ...(statusParam ? { status: statusParam as CaseStatus } : {}),
    ...((from || to) ? { openedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {})
  };
  const words = q?.split(/\s+/).filter(Boolean).slice(0, 8) ?? [];
  const contains = (word: string) => ({ contains: word, mode: "insensitive" as const });
  const caseSearch = (word: string): Prisma.CaseWhereInput[] => [
    { name: contains(word) },
    { code: contains(word) },
    { description: contains(word) },
    { notes: contains(word) },
    { responsible: { is: { name: contains(word) } } },
    { responsible: { is: { email: contains(word) } } },
    { people: { some: { OR: [
      { name: contains(word) }, { role: contains(word) }, { document: contains(word) },
      { email: contains(word) }, { phone: contains(word) }, { notes: contains(word) }
    ] } } },
    { tasks: { some: { title: contains(word) } } },
    { events: { some: { OR: [{ title: contains(word) }, { description: contains(word) }] } } },
    { analyses: { some: { OR: [
      { type: contains(word) }, { procedure: contains(word) }, { result: contains(word) }, { conclusion: contains(word) },
      { performedBy: { is: { name: contains(word) } } }
    ] } } },
    { reports: { some: { OR: [{ title: contains(word) }, { content: contains(word) }] } } }
  ];
  const metadata = { id: true, code: true, name: true, openedAt: true, priority: true, status: true, responsible: { select: { name: true } } };

  const [cases, people, devices, evidences, findings, tasks, analyses, reports] = await Promise.all([
    prisma.case.findMany({
      where: { AND: [caseFilter, ...(words.length ? [{ OR: words.flatMap(caseSearch) }] : [])] },
      select: metadata,
      orderBy: { openedAt: "desc" },
      take: 30
    }),
    prisma.person.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { code: contains(word) }, { name: contains(word) }, { role: contains(word) }, { email: contains(word) },
          { document: contains(word) }, { phone: contains(word) }, { notes: contains(word) }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.device.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { code: contains(word) }, { serialNumber: contains(word) }, { imei: contains(word) },
          { macAddress: contains(word) }, { brand: contains(word) }, { model: contains(word) }, { notes: contains(word) }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.evidence.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { code: contains(word) }, { description: contains(word) }, { origin: contains(word) },
          { collectionPlace: contains(word) }, { serialNumber: contains(word) }, { technicalIds: contains(word) }, { notes: contains(word) }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.finding.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { code: contains(word) }, { title: contains(word) }, { description: contains(word) }, { type: contains(word) }, { notes: contains(word) }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.task.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { title: contains(word) },
          { assignedTo: { is: { name: contains(word) } } }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.analysis.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [
          { code: contains(word) }, { type: contains(word) }, { procedure: contains(word) },
          { result: contains(word) }, { conclusion: contains(word) },
          { performedBy: { is: { name: contains(word) } } }
        ]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    }),
    prisma.caseReport.findMany({
      where: words.length ? {
        OR: words.flatMap((word) => [{ title: contains(word) }, { content: contains(word) }]),
        case: { is: caseFilter }
      } : { OR: [] },
      include: { case: { select: metadata } }, take: 10
    })
  ]);

  const results = [
    ...cases.map((c) => ({ kind: "Caso", code: c.code, label: c.name, caseId: c.id, caseCode: c.code, case: c })),
    ...people.map((p) => ({ kind: "Pessoa", code: p.code, label: p.name, caseId: p.case.id, caseCode: p.case.code, case: p.case })),
    ...devices.map((d) => ({ kind: "Dispositivo", code: d.code, label: `${d.brand ?? ""} ${d.model ?? ""}`.trim() || d.type, caseId: d.case.id, caseCode: d.case.code, case: d.case })),
    ...evidences.map((e) => ({ kind: "Evidência", code: e.code, label: e.description, caseId: e.case.id, caseCode: e.case.code, case: e.case })),
    ...findings.map((f) => ({ kind: "Achado", code: f.code, label: f.title, caseId: f.case.id, caseCode: f.case.code, case: f.case })),
    ...tasks.map((t) => ({ kind: "Tarefa", code: t.case.code, label: t.title, caseId: t.case.id, caseCode: t.case.code, case: t.case })),
    ...analyses.map((a) => ({ kind: "Análise", code: a.code, label: a.type, caseId: a.case.id, caseCode: a.case.code, case: a.case })),
    ...reports.map((r) => ({ kind: "Relatório", code: `v${r.version}`, label: r.title, caseId: r.case.id, caseCode: r.case.code, case: r.case }))
  ];

  return NextResponse.json({ query: q, results });
}
