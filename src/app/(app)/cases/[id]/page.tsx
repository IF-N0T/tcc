import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import CaseWorkspace from "@/components/case/CaseWorkspace";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();

  const kase = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      responsible: true,
      people: { orderBy: { createdAt: "desc" } },
      devices: { orderBy: { createdAt: "desc" }, include: { person: true } },
      evidences: { orderBy: { createdAt: "desc" }, include: { hashes: true, custodyEvents: true, device: true } },
      findings: { orderBy: { createdAt: "desc" } },
      tasks: { orderBy: { createdAt: "desc" } },
      events: { orderBy: { occurredAt: "asc" } },
      relationships: { orderBy: { createdAt: "asc" } }
    }
  });

  if (!kase) notFound();

  return <CaseWorkspace kase={JSON.parse(JSON.stringify(kase))} role={session!.role} />;
}
