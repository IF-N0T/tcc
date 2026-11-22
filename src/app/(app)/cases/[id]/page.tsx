import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import CaseWorkspace from "@/components/case/CaseWorkspace";
import { loadCaseData } from "@/lib/case-data";
import { detectGaps } from "@/lib/watson/gaps";

export const dynamic = "force-dynamic";
const EVIDENCE_GAP_CODES = new Set([
  "GAP_HASH_AUSENTE", "GAP_HASH_FRACO", "GAP_HASH_DIVERGENTE",
  "GAP_CUSTODIA_AUSENTE", "GAP_CUSTODIA_ELO", "GAP_CUSTODIA_DADOS",
  "GAP_EVIDENCIA_SEM_ANALISE"
]);

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const [session, kase, caseData] = await Promise.all([
    getSession(),
    prisma.case.findUnique({
    where: { id: params.id },
    include: {
      responsible: { select: { name: true, email: true } },
      people: { orderBy: { createdAt: "desc" } },
      devices: { orderBy: { createdAt: "desc" }, include: { person: true } },
      evidences: { orderBy: { createdAt: "desc" }, include: { hashes: true, custodyEvents: true, device: true } },
      findings: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { occurredAt: "asc" } },
      relationships: { orderBy: { createdAt: "asc" } },
      relationshipNodePositions: { select: { entityType: true, entityId: true, x: true, y: true } },
      analyses: { orderBy: { performedAt: "desc" }, include: { tool: { select: { name: true, version: true } }, performedBy: { select: { name: true } } } },
      caseNotes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, role: true } } } },
      toolImports: { orderBy: { createdAt: "desc" }, include: { tool: { select: { name: true } } } }
    }
    }),
    loadCaseData(params.id)
  ]);

  if (!kase) notFound();
  const previousVisit = session ? await prisma.caseVisit.findUnique({
    where: { userId_caseId: { userId: session.sub, caseId: kase.id } },
    select: { lastTab: true }
  }) : null;

  const detectedGaps = caseData ? detectGaps(caseData) : [];
  const gapsByEvidence = Object.fromEntries(kase.evidences.map((evidence) => [
    evidence.id,
    detectedGaps.filter((gap) =>
      EVIDENCE_GAP_CODES.has(gap.code) &&
      gap.sources.some((source) => source.kind === "Evidência" && source.code === evidence.code)
    )
  ]));

  return <CaseWorkspace
    kase={JSON.parse(JSON.stringify(kase))}
    role={session!.role}
    actorName={session!.name}
    initialTab={previousVisit?.lastTab ?? "overview"}
    gapsByEvidence={JSON.parse(JSON.stringify(gapsByEvidence))}
  />;
}
