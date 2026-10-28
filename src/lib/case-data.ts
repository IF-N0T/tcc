import { prisma } from "./prisma";
import type { CaseData } from "./case-types";

export const CASE_INCLUDE = {
  responsible: { select: { name: true, email: true } },
  people: { orderBy: { createdAt: "asc" as const } },
  devices: { orderBy: { createdAt: "asc" as const } },
  evidences: { orderBy: { createdAt: "asc" as const }, include: { hashes: { orderBy: { calculatedAt: "asc" as const } }, custodyEvents: { orderBy: { occurredAt: "asc" as const } } } },
  findings: { orderBy: { createdAt: "asc" as const } },
  analyses: { orderBy: { performedAt: "asc" as const }, include: { tool: { select: { name: true, version: true } }, performedBy: { select: { name: true } } } },
  tasks: { orderBy: { createdAt: "asc" as const }, include: { assignedTo: { select: { name: true } } } },
  events: { orderBy: { occurredAt: "asc" as const } },
  relationships: { orderBy: { createdAt: "asc" as const } },
  caseNotes: { orderBy: { createdAt: "asc" as const }, include: { author: { select: { name: true } } } },
  toolImports: { orderBy: { createdAt: "asc" as const }, include: { tool: { select: { name: true } }, importedBy: { select: { name: true } } } }
};

/** Carrega todos os dados de um caso no formato único usado por exportações e Watson. */
export async function loadCaseData(caseId: string): Promise<CaseData | null> {
  const k = await prisma.case.findUnique({ where: { id: caseId }, include: CASE_INCLUDE });
  if (!k) return null;

  const userIds = new Set<string>();
  for (const e of k.evidences) {
    if (e.collectedById) userIds.add(e.collectedById);
    e.hashes.forEach((h) => userIds.add(h.calculatedById));
    e.custodyEvents.forEach((c) => userIds.add(c.registeredById));
  }
  const users = userIds.size
    ? await prisma.user.findMany({ where: { id: { in: [...userIds] } }, select: { id: true, name: true } })
    : [];

  const { toolImports, ...rest } = k;
  return {
    ...rest,
    imports: toolImports,
    userNames: Object.fromEntries(users.map((u) => [u.id, u.name]))
  } as unknown as CaseData;
}
