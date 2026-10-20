import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const [analyses, caseCount, cases, tools, session] = await Promise.all([
    prisma.analysis.findMany({
      orderBy: { performedAt: "desc" },
      take: 100,
      include: {
        case: { select: { id: true, code: true, name: true } },
        evidence: { select: { code: true, description: true } },
        performedBy: { select: { name: true } },
        tool: { select: { name: true } }
      }
    }),
    prisma.case.count(),
    prisma.case.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        code: true,
        name: true,
        evidences: { select: { id: true, code: true, description: true } }
      }
    }),
    prisma.tool.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, vendor: true, version: true } }),
    getSession()
  ]);

  return (
    <BacklogScreens
      section="analyses"
      analyses={analyses}
      cases={cases}
      caseCount={caseCount}
      toolCount={tools.length}
      tools={tools.map((tool) => ({ ...tool, analysesCount: 0 }))}
      canEdit={session?.role === "ADMIN" || session?.role === "PERITO"}
    />
  );
}
