import { prisma } from "../prisma";

/** Busca textual nos registros (mesma lógica do assistente anterior, agora reutilizável). */
export async function searchRecords(query: string) {
  const words = [...new Set(query.split(/\s+/).filter((w) => w.length > 1))].slice(0, 6);
  if (!words.length) return [];
  const ci = (field: string, w: string) => ({ [field]: { contains: w, mode: "insensitive" as const } });
  const any = (fields: string[]) => ({ OR: words.flatMap((w) => fields.map((f) => ci(f, w))) });

  const [cases, people, evidences, findings, analyses, tasks, notes] = await Promise.all([
    prisma.case.findMany({ where: any(["name", "code", "description", "notes"]), take: 5, select: { id: true, code: true, name: true, status: true, priority: true } }),
    prisma.person.findMany({ where: any(["name", "role", "email", "document", "phone", "notes"]), take: 8, select: { code: true, name: true, role: true, email: true, case: { select: { id: true, code: true } } } }),
    prisma.evidence.findMany({ where: any(["code", "description", "origin", "collectionPlace", "technicalIds", "notes"]), take: 8, select: { code: true, description: true, case: { select: { id: true, code: true } } } }),
    prisma.finding.findMany({ where: any(["title", "description", "type", "notes"]), take: 8, select: { code: true, title: true, description: true, case: { select: { id: true, code: true } } } }),
    prisma.analysis.findMany({ where: any(["code", "type", "result", "conclusion", "procedure"]), take: 8, select: { code: true, type: true, result: true, case: { select: { id: true, code: true } } } }),
    prisma.task.findMany({ where: any(["title"]), take: 8, select: { title: true, status: true, case: { select: { id: true, code: true } } } }),
    prisma.caseNote.findMany({ where: any(["text"]), take: 6, select: { text: true, case: { select: { id: true, code: true } } } })
  ]);

  return [
    ...cases.map((i) => ({ kind: "Caso", code: i.code, title: i.name, detail: `${i.status} · prioridade ${i.priority}`, caseId: i.id, caseCode: i.code })),
    ...people.map((i) => ({ kind: "Pessoa", code: i.code, title: i.name, detail: i.role ?? i.email ?? "Pessoa vinculada", caseId: i.case.id, caseCode: i.case.code })),
    ...evidences.map((i) => ({ kind: "Evidência", code: i.code, title: i.description, detail: `Caso ${i.case.code}`, caseId: i.case.id, caseCode: i.case.code })),
    ...findings.map((i) => ({ kind: "Achado", code: i.code, title: i.title, detail: i.description.slice(0, 160), caseId: i.case.id, caseCode: i.case.code })),
    ...analyses.map((i) => ({ kind: "Análise", code: i.code, title: i.type, detail: (i.result ?? "Sem resultado registrado").slice(0, 160), caseId: i.case.id, caseCode: i.case.code })),
    ...tasks.map((i) => ({ kind: "Tarefa", code: i.status, title: i.title, detail: `Caso ${i.case.code}`, caseId: i.case.id, caseCode: i.case.code })),
    ...notes.map((i) => ({ kind: "Nota", code: "diário", title: i.text.slice(0, 80), detail: `Caso ${i.case.code}`, caseId: i.case.id, caseCode: i.case.code }))
  ];
}

/** Descobre a qual caso pertence cada código citado na mensagem (CAS/EVD/DEV/PES/ANA/ACH). */
export async function resolveCaseFromCodes(codes: string[]): Promise<string | null> {
  for (const code of codes) {
    const prefix = code.slice(0, 3);
    let id: string | null | undefined;
    if (prefix === "CAS") id = (await prisma.case.findUnique({ where: { code }, select: { id: true } }))?.id;
    else if (prefix === "EVD") id = (await prisma.evidence.findUnique({ where: { code }, select: { caseId: true } }))?.caseId;
    else if (prefix === "DEV") id = (await prisma.device.findUnique({ where: { code }, select: { caseId: true } }))?.caseId;
    else if (prefix === "PES") id = (await prisma.person.findUnique({ where: { code }, select: { caseId: true } }))?.caseId;
    else if (prefix === "ANA") id = (await prisma.analysis.findUnique({ where: { code }, select: { caseId: true } }))?.caseId;
    else if (prefix === "ACH") id = (await prisma.finding.findUnique({ where: { code }, select: { caseId: true } }))?.caseId;
    if (id) return id;
  }
  return null;
}
