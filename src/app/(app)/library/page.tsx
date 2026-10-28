import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/ui/PageHeader";
import LibraryScreen from "@/components/watson/LibraryScreen";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const session = await getSession();
  const items = await prisma.knowledgeEntry.findMany({ orderBy: [{ title: "asc" }], select: { id: true, slug: true, title: true, category: true, summary: true, content: true, tags: true, appliesTo: true, source: true, builtIn: true, authorId: true } });
  return (
    <div>
      <PageHeader eyebrow="Watson" title="Biblioteca Watson" description="Procedimentos, normas, guias de ferramentas e modelos de texto usados pelo Watson para aconselhar. Você pode acrescentar os seus." />
      {items.length === 0 && <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-gray-700">A biblioteca está vazia. Rode <code className="font-mono">npm run prisma:seed</code> para carregar os itens padrão.</p>}
      <LibraryScreen initial={items} role={session?.role ?? "VISUALIZADOR"} userId={session?.sub ?? ""} />
    </div>
  );
}
