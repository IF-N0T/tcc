import Link from "next/link";
import { ArrowRight, Bot, FolderPlus, ShieldAlert, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { loadCaseData } from "@/lib/case-data";
import { detectGaps } from "@/lib/watson/gaps";
import { isOnline } from "@/lib/presence";
import { STATUS_LABEL, PRIORITY_LABEL } from "@/lib/labels";
import StatusBadge from "@/components/StatusBadge";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import Avatar from "@/components/ui/Avatar";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "entrou no sistema", LOGOUT: "saiu do sistema", EXPORTACAO_RELATORIO: "exportou um relatório", IMPORTACAO_FERRAMENTA: "importou dados de ferramenta",
  NOTA_DIARIO: "registrou nota no diário", CRIACAO_CASO: "criou um caso", ALTERACAO_USUARIO: "alterou uma conta"
};

async function getData(isAdmin: boolean) {
  const [activeCases, concludedCases, evidenceCount, pendingTasks, recentFindings, recentCases, recentAudit, byStatus, byPriority, users] = await Promise.all([
    prisma.case.count({ where: { status: { in: ["EM_ANALISE", "AGUARDANDO_EVIDENCIAS", "EM_ELABORACAO_LAUDO"] } } }),
    prisma.case.count({ where: { status: "CONCLUIDO" } }),
    prisma.evidence.count(),
    prisma.task.count({ where: { status: { not: "CONCLUIDA" } } }),
    prisma.finding.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { case: true } }),
    prisma.case.findMany({ orderBy: { updatedAt: "desc" }, take: 6, include: { responsible: true, tasks: { select: { status: true } }, _count: { select: { evidences: true } } } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 7, include: { user: true } }),
    prisma.case.groupBy({ by: ["status"], _count: true }),
    prisma.case.groupBy({ by: ["priority"], _count: true }),
    isAdmin ? prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true, lastSeenAt: true, leftAt: true }, orderBy: { name: "asc" } }) : Promise.resolve([])
  ]);

  // Pendências do Watson nos casos ativos mais recentes (regras determinísticas; falha não derruba o painel).
  const gaps: { caseId: string; caseCode: string; title: string; severity: string }[] = [];
  try {
    const active = await prisma.case.findMany({ where: { status: { not: "ARQUIVADO" } }, orderBy: { updatedAt: "desc" }, take: 6, select: { id: true } });
    for (const c of active) {
      const data = await loadCaseData(c.id);
      if (!data) continue;
      for (const g of detectGaps(data).filter((x) => x.severity === "alta").slice(0, 3)) gaps.push({ caseId: data.id, caseCode: data.code, title: g.title, severity: g.severity });
    }
  } catch (e) { console.error("Watson dashboard:", e); }

  return { activeCases, concludedCases, evidenceCount, pendingTasks, recentFindings, recentCases, recentAudit, byStatus, byPriority, users, gaps: gaps.slice(0, 7) };
}

const STATUS_COLOR: Record<string, string> = { EM_ANALISE: "#3b82f6", AGUARDANDO_EVIDENCIAS: "#f59e0b", EM_ELABORACAO_LAUDO: "#a855f7", CONCLUIDO: "#22c55e", ARQUIVADO: "#6b7280" };
const PRIORITY_COLOR: Record<string, string> = { BAIXA: "#6b7280", MEDIA: "#3b82f6", ALTA: "#f59e0b", CRITICA: "#ef4444" };

function Kpi({ label, value, tone, hint }: { label: string; value: number; tone?: string; hint?: string }) {
  return (
    <div className="card rise p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`font-display mt-2 text-4xl font-semibold ${tone ?? "text-gray-900"}`}><AnimatedNumber value={value} /></div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </div>
  );
}

function Distribution({ title, rows, labels, colors }: { title: string; rows: { key: string; count: number }[]; labels: Record<string, string>; colors: Record<string, string> }) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {total === 0 ? <p className="mt-3 text-sm text-gray-500">Sem dados.</p> : (
        <>
          <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-gray-100" role="img" aria-label={title}>
            {rows.map((r) => <span key={r.key} title={`${labels[r.key] ?? r.key}: ${r.count}`} style={{ width: `${(r.count / total) * 100}%`, background: colors[r.key] ?? "#888" }} />)}
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {rows.map((r) => <li key={r.key} className="flex items-center gap-2 text-gray-700"><span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[r.key] ?? "#888" }} />{labels[r.key] ?? r.key}<span className="ml-auto font-medium text-gray-900">{r.count}</span></li>)}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const canCreate = session?.role === "ADMIN" || session?.role === "PERITO";
  const data = await getData(isAdmin);
  const hour = Number(new Date().toLocaleString("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const onlineUsers = data.users.filter((u) => isOnline(u));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" })}
        title={`${greeting}, ${session?.name.split(" ")[0] ?? ""}`}
        description="Resumo dos casos, pendências detectadas pelo Watson e atividade recente."
        actions={<>
          <Link href="/assistant" className="btn-secondary"><Bot size={16} aria-hidden="true" /> Perguntar ao Watson</Link>
          {canCreate && <Link href="/cases/new" className="btn-primary"><FolderPlus size={16} aria-hidden="true" /> Novo caso</Link>}
        </>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Casos ativos" value={data.activeCases} tone="text-brand-700" />
        <Kpi label="Concluídos" value={data.concludedCases} tone="text-green-700" />
        <Kpi label="Evidências" value={data.evidenceCount} />
        <Kpi label="Tarefas pendentes" value={data.pendingTasks} tone="text-amber-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2" aria-labelledby="recent-cases">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-cases" className="text-sm font-semibold text-gray-900">Casos recentes</h2>
            <Link href="/cases" className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline">Ver todos <ArrowRight size={12} aria-hidden="true" /></Link>
          </div>
          <ul className="divide-y divide-gray-100">
            {data.recentCases.map((c) => {
              const done = c.tasks.filter((t) => t.status === "CONCLUIDA").length;
              const pct = c.tasks.length ? Math.round((done / c.tasks.length) * 100) : 0;
              return (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition hover:bg-gray-100">
                    <Avatar name={c.responsible.name} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="tag-code">{c.code}</span><span className="truncate text-sm font-medium text-gray-900">{c.name}</span></div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-gray-500">
                        <span>{c._count.evidences} evid.</span><span aria-hidden="true">·</span>
                        <span className="flex items-center gap-1.5">tarefas <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><span className="block h-full bg-brand-500" style={{ width: `${pct}%` }} /></span>{c.tasks.length ? `${pct}%` : "—"}</span>
                      </div>
                    </div>
                    <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex"><StatusBadge value={c.status} /><StatusBadge value={c.priority} /></div>
                  </Link>
                </li>
              );
            })}
            {data.recentCases.length === 0 && <li className="py-8 text-center text-sm text-gray-500">Nenhum caso cadastrado ainda.</li>}
          </ul>
        </section>

        <section className="card p-5" aria-labelledby="watson-gaps">
          <div className="mb-3 flex items-center gap-2"><ShieldAlert size={16} className="text-red-500" aria-hidden="true" /><h2 id="watson-gaps" className="text-sm font-semibold text-gray-900">Pendências graves (Watson)</h2></div>
          {data.gaps.length === 0 ? <p className="text-sm text-gray-500">Nenhuma lacuna de severidade alta nos casos ativos recentes.</p> : (
            <ul className="space-y-3">
              {data.gaps.map((g, i) => (
                <li key={i} className="text-sm"><Link href={`/cases/${g.caseId}`} className="font-medium text-gray-800 hover:text-brand-700">{g.title}</Link><div className="mt-0.5"><span className="tag-code">{g.caseCode}</span></div></li>
              ))}
            </ul>
          )}
          <Link href="/assistant" className="btn-secondary mt-4 w-full !text-xs"><Bot size={14} aria-hidden="true" /> Analisar um caso com o Watson</Link>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Distribution title="Casos por situação" rows={data.byStatus.map((r) => ({ key: r.status, count: r._count }))} labels={STATUS_LABEL} colors={STATUS_COLOR} />
        <Distribution title="Casos por prioridade" rows={data.byPriority.map((r) => ({ key: r.priority, count: r._count }))} labels={PRIORITY_LABEL} colors={PRIORITY_COLOR} />
        {isAdmin ? (
          <section className="card p-5" aria-labelledby="online">
            <div className="mb-3 flex items-center justify-between"><h2 id="online" className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Users size={16} aria-hidden="true" /> Contas online</h2><Link href="/admin/users" className="text-xs text-brand-700 hover:underline">Gerenciar</Link></div>
            <p className="text-3xl font-semibold text-gray-900">{onlineUsers.length}<span className="ml-1 text-sm font-normal text-gray-500">de {data.users.length}</span></p>
            <ul className="mt-3 space-y-2">{data.users.map((u) => <li key={u.id} className="flex items-center gap-2 text-sm text-gray-700"><Avatar name={u.name} size={24} online={isOnline(u)} />{u.name}<span className="ml-auto text-xs text-gray-500">{isOnline(u) ? "online" : "offline"}</span></li>)}</ul>
          </section>
        ) : (
          <section className="card p-5"><h2 className="text-sm font-semibold text-gray-900">Achados recentes</h2>
            <ul className="mt-3 space-y-3">{data.recentFindings.map((f) => <li key={f.id} className="text-sm"><Link href={`/cases/${f.caseId}`} className="font-medium text-gray-800 hover:text-brand-700">{f.title}</Link><div className="text-xs text-gray-500">{f.case.code}</div></li>)}{data.recentFindings.length === 0 && <li className="text-sm text-gray-500">Nenhum achado registrado.</li>}</ul></section>
        )}
      </div>

      <section className="card p-5" aria-labelledby="activity">
        <h2 id="activity" className="mb-3 text-sm font-semibold text-gray-900">Últimas atividades</h2>
        <ul className="divide-y divide-gray-100 text-sm">
          {data.recentAudit.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={a.user?.name ?? "Sistema"} size={26} />
              <span className="min-w-0 flex-1 truncate text-gray-700"><span className="font-medium text-gray-900">{a.user?.name ?? "Sistema"}</span> {ACTION_LABEL[a.action] ?? a.action.toLowerCase().replace(/_/g, " ")}</span>
              <time className="shrink-0 text-xs text-gray-500">{new Date(a.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
            </li>
          ))}
          {data.recentAudit.length === 0 && <li className="py-4 text-gray-500">Sem atividades registradas.</li>}
        </ul>
      </section>
    </div>
  );
}
