import Link from "next/link";
import { ArrowUpRight, Clock3, History } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const TAB_LABELS: Record<string, string> = {
  overview: "Visão Geral",
  people: "Pessoas & Dispositivos",
  evidence: "Evidências & Custódia",
  analyses: "Análises & Importações",
  relationships: "Mapa de Relacionamentos",
  timeline: "Timeline",
  findings: "Achados",
  tasks: "Tarefas",
  notes: "Diário do perito",
  watson: "Watson"
};

export default async function PersonalHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const visits = await prisma.caseVisit.findMany({
    where: { userId: session.sub },
    orderBy: { lastVisitedAt: "desc" },
    take: 100,
    include: { case: { select: { id: true, code: true, name: true, status: true } } }
  });

  return (
    <div>
      <PageHeader
        eyebrow="Pessoal"
        title="Meu histórico"
        description="Veja os casos que você acessou e retome cada um na última seção visitada. Este histórico é exclusivo da sua conta."
      />

      {visits.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
          <History size={34} className="text-gray-400" aria-hidden="true" />
          <h2 className="font-display text-lg font-semibold text-gray-900">Nenhum caso acessado ainda</h2>
          <p className="max-w-sm text-sm text-gray-500">Quando você abrir um caso, ele aparecerá aqui para facilitar a retomada.</p>
          <Link href="/cases" className="btn-primary mt-2">Ver casos</Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {visits.map((visit) => (
            <li key={visit.id} className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="tag-code">{visit.case.code}</span>
                  <StatusBadge value={visit.case.status} />
                </div>
                <h2 className="mt-2 truncate font-display text-lg font-semibold text-gray-900">{visit.case.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5">
                    <History size={14} aria-hidden="true" />
                    Última seção: {TAB_LABELS[visit.lastTab] ?? TAB_LABELS.overview}
                  </span>
                  <time dateTime={visit.lastVisitedAt.toISOString()} className="inline-flex items-center gap-1.5">
                    <Clock3 size={14} aria-hidden="true" />
                    {new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: "America/Sao_Paulo"
                    }).format(visit.lastVisitedAt)}
                  </time>
                </div>
              </div>
              <Link href={`/cases/${visit.case.id}#${visit.lastTab}`} className="btn-secondary shrink-0">
                Continuar <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
