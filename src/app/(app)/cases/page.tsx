import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import CasesBoard, { type CaseRow } from "@/components/CasesBoard";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const session = await getSession();
  const canEdit = session?.role === "ADMIN" || session?.role === "PERITO";
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: "desc" },
    include: { responsible: true, tasks: { select: { status: true } }, _count: { select: { evidences: true, findings: true } } }
  });

  const rows: CaseRow[] = cases.map((c) => ({
    id: c.id, code: c.code, name: c.name, description: c.description, status: c.status, priority: c.priority,
    responsible: c.responsible.name, openedAt: c.openedAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
    evidences: c._count.evidences, findings: c._count.findings,
    tasksDone: c.tasks.filter((t) => t.status === "CONCLUIDA").length, tasksTotal: c.tasks.length
  }));

  return (
    <div>
      <PageHeader eyebrow="Investigação" title="Casos" description="Todos os casos, com situação, prioridade e andamento das tarefas. Use / para buscar."
        actions={canEdit && <Link href="/cases/new" className="btn-primary"><FolderPlus size={16} aria-hidden="true" /> Novo caso</Link>} />
      <CasesBoard cases={rows} canEdit={canEdit} />
    </div>
  );
}
