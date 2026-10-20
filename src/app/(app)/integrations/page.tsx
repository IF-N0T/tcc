import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [tools, cases, session] = await Promise.all([
    prisma.tool.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { analyses: true } } } }),
    prisma.case.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true } }),
    getSession()
  ]);

  return (
    <BacklogScreens
      section="integrations"
      cases={cases}
      canEdit={session?.role === "ADMIN" || session?.role === "PERITO"}
      tools={tools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        vendor: tool.vendor,
        version: tool.version,
        analysesCount: tool._count.analyses
      }))}
    />
  );
}
