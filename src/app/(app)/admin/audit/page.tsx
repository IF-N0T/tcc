import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/ui/PageHeader";
import AuditTable from "@/components/admin/AuditTable";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 500, include: { user: true } });
  return (
    <div>
      <PageHeader eyebrow="Administração" title="Logs de auditoria" description="Registros gerados automaticamente a cada ação sensível. Não podem ser editados nem excluídos por esta interface (mostrando os 500 mais recentes)." />
      <AuditTable logs={logs.map((l) => ({ id: l.id, createdAt: l.createdAt.toISOString(), user: l.user?.name ?? "Sistema", action: l.action, entityType: l.entityType, entityId: l.entityId, details: l.details }))} />
    </div>
  );
}
