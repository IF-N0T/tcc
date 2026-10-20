import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const tools = await prisma.tool.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { analyses: true } } }
  });

  return (
    <BacklogScreens
      section="integrations"
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
