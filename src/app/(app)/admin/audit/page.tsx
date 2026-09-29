import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: true }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Logs de auditoria</h1>
      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Usuário</th>
              <th>Ação</th>
              <th>Entidade</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap text-xs text-gray-500">
                  {new Date(l.createdAt).toLocaleString("pt-BR")}
                </td>
                <td>{l.user?.name ?? "Sistema"}</td>
                <td className="font-medium">{l.action}</td>
                <td>{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}</td>
                <td className="text-gray-500">{l.details ?? "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="text-center text-gray-400 py-8">Nenhum registro ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400">
        Estes registros são gerados automaticamente pelo sistema a cada ação sensível e não podem ser editados ou
        excluídos por esta interface.
      </p>
    </div>
  );
}
