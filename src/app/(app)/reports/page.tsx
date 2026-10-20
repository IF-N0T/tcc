import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [cases, reportVersions, session] = await Promise.all([
    prisma.case.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, code: true, name: true }
    }),
    prisma.caseReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        version: true,
        title: true,
        format: true,
        createdAt: true,
        case: { select: { id: true, code: true, name: true } },
        author: { select: { name: true } }
      }
    }),
    getSession()
  ]);

  return <BacklogScreens section="reports" cases={cases} reportVersions={reportVersions} canEdit={session?.role === "ADMIN" || session?.role === "PERITO"} />;
}
