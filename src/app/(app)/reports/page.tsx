import BacklogScreens from "@/components/backlog/BacklogScreens";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, code: true, name: true }
  });

  return <BacklogScreens section="reports" cases={cases} />;
}
