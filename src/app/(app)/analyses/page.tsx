import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalysesPage() {
  const [analyses, caseCount, cases, toolCount] = await Promise.all([
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
    prisma.tool.count()
  ]);

  return (
    <BacklogScreens
      section="analyses"
      analyses={analyses}
      cases={cases}
      caseCount={caseCount}
      toolCount={toolCount}
    />
  );
}
