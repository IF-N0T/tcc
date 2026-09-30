import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import StatusBadge from "@/components/StatusBadge";
import DeleteCaseButton from "@/components/DeleteCaseButton";

export const dynamic = "force-dynamic";

async function getData() {
  const [
    activeCases,
    concludedCases,
    evidenceCount,
    pendingTasks,
    recentFindings,
    recentCases,
    recentAudit
  ] = await Promise.all([
    prisma.case.count({ where: { status: { in: ["EM_ANALISE", "AGUARDANDO_EVIDENCIAS", "EM_ELABORACAO_LAUDO"] } } }),
    prisma.case.count({ where: { status: "CONCLUIDO" } }),
    prisma.evidence.count(),
    prisma.task.count({ where: { status: { not: "CONCLUIDA" } } }),
    prisma.finding.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { case: true } }),
    prisma.case.findMany({ orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true } })
  ]);

  return { activeCases, concludedCases, evidenceCount, pendingTasks, recentFindings, recentCases, recentAudit };
}

function KpiCard({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent ?? "text-gray-900"}`}>{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [data, session] = await Promise.all([getData(), getSession()]);
  const canDeleteCases = session?.role === "ADMIN" || session?.role === "PERITO";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/cases/new" className="btn-primary text-sm">+ Novo caso</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Casos ativos" value={data.activeCases} accent="text-brand-700" />
        <KpiCard label="Casos concluídos" value={data.concludedCases} accent="text-green-700" />
        <KpiCard label="Evidências cadastradas" value={data.evidenceCount} />
        <KpiCard label="Tarefas pendentes" value={data.pendingTasks} accent="text-amber-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-800">Casos recentemente acessados</h2>
            <Link href="/cases" className="text-xs text-brand-700 hover:underline">Ver todos</Link>
          </div>
          <table className="table-base">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Prioridade</th>
                {canDeleteCases && <th className="text-right">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {data.recentCases.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer">
                  <td>
                    <Link href={`/cases/${c.id}`} className="text-brand-700 font-medium">{c.code}</Link>
                  </td>
                  <td>{c.name}</td>
                  <td><StatusBadge value={c.status} /></td>
                  <td><StatusBadge value={c.priority} /></td>
                  {canDeleteCases && (
                    <td className="text-right">
                      <DeleteCaseButton caseId={c.id} caseCode={c.code} />
                    </td>
                  )}
                </tr>
              ))}
              {data.recentCases.length === 0 && (
                <tr><td colSpan={canDeleteCases ? 5 : 4} className="text-center text-gray-400 py-6">Nenhum caso cadastrado ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-3">Achados recentes</h2>
          <ul className="space-y-3">
            {data.recentFindings.map((f) => (
              <li key={f.id} className="text-sm">
                <Link href={`/cases/${f.caseId}`} className="font-medium text-gray-800 hover:text-brand-700">
                  {f.title}
                </Link>
                <div className="text-xs text-gray-500">{f.case.code}</div>
              </li>
            ))}
            {data.recentFindings.length === 0 && <li className="text-sm text-gray-400">Nenhum achado registrado ainda.</li>}
          </ul>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Últimas atividades</h2>
        <ul className="text-sm divide-y divide-gray-100">
          {data.recentAudit.map((a) => (
            <li key={a.id} className="py-2 flex justify-between">
              <span>
                <span className="font-medium">{a.user?.name ?? "Sistema"}</span> — {a.action} ({a.entityType})
              </span>
              <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString("pt-BR")}</span>
            </li>
          ))}
          {data.recentAudit.length === 0 && <li className="py-4 text-gray-400">Sem atividades registradas.</li>}
        </ul>
      </div>
    </div>
  );
}
