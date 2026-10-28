import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/ui/PageHeader";
import ReportsHub from "@/components/reports/ReportsHub";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [cases, versions, session] = await Promise.all([
    prisma.case.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true } }),
    prisma.caseReport.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, version: true, title: true, format: true, createdAt: true, case: { select: { id: true, code: true, name: true } }, author: { select: { name: true } } } }),
    getSession()
  ]);
  return (
    <div>
      <PageHeader eyebrow="Documentos e dados" title="Laudos e relatórios" description="Gere o relatório do caso em HTML (colorido ou preto e branco), Excel, Bloco de Notas ou pacote completo, com versão para impressão." />
      <ReportsHub cases={cases} versions={JSON.parse(JSON.stringify(versions))} canEdit={session?.role === "ADMIN" || session?.role === "PERITO"} />
    </div>
  );
}
