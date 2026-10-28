import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/ui/PageHeader";
import IntegrationsHub from "@/components/integrations/IntegrationsHub";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const [tools, cases, session] = await Promise.all([
    prisma.tool.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { analyses: true } } } }),
    prisma.case.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true, evidences: { select: { id: true, code: true, description: true }, orderBy: { code: "asc" } } } }),
    getSession()
  ]);
  return (
    <div>
      <PageHeader eyebrow="Documentos e dados" title="Integrações" description="Importe resultados do Autopsy, ImageJ e listas de hash, e exporte arquivos para Excel, Bloco de Notas, Autopsy e Timesketch." />
      <IntegrationsHub cases={cases} tools={tools.map((t) => ({ id: t.id, name: t.name, vendor: t.vendor, version: t.version, analysesCount: t._count.analyses }))} canEdit={session?.role === "ADMIN" || session?.role === "PERITO"} />
    </div>
  );
}
