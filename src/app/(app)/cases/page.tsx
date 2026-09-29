import Link from "next/link";
import { prisma } from "@/lib/prisma";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const cases = await prisma.case.findMany({
    orderBy: { updatedAt: "desc" },
    include: { responsible: true, _count: { select: { evidences: true, findings: true, tasks: true } } }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Casos</h1>
        <Link href="/cases/new" className="btn-primary text-sm">+ Novo caso</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="table-base">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>Responsável</th>
              <th>Status</th>
              <th>Prioridade</th>
              <th>Evidências</th>
              <th>Achados</th>
              <th>Aberto em</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td>
                  <Link href={`/cases/${c.id}`} className="text-brand-700 font-medium">
                    {c.code}
                  </Link>
                </td>
                <td>{c.name}</td>
                <td>{c.responsible.name}</td>
                <td><StatusBadge value={c.status} /></td>
                <td><StatusBadge value={c.priority} /></td>
                <td>{c._count.evidences}</td>
                <td>{c._count.findings}</td>
                <td>{new Date(c.openedAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-8">
                  Nenhum caso cadastrado ainda. Crie o primeiro caso para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
