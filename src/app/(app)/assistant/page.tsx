import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import PageHeader from "@/components/ui/PageHeader";
import WatsonPanel from "@/components/watson/WatsonPanel";
import Link from "next/link";
import { BookOpen, GitBranch, Search, SearchCheck, FileSignature } from "lucide-react";

export const dynamic = "force-dynamic";

const POWERS = [
  { icon: SearchCheck, title: "Lacunas", text: "Hash ausente, custódia com elo quebrado, datas incoerentes, IMEI inválido, nota que cita algo não cadastrado." },
  { icon: GitBranch, title: "Procedência", text: "“De onde veio?” e “o que foi feito depois?” para evidências, achados, análises e dispositivos." },
  { icon: Search, title: "Comparação", text: "Hashes, pessoas e dispositivos que aparecem em outros casos e em arquivos importados." },
  { icon: BookOpen, title: "Biblioteca", text: "Procedimentos, normas e guias (Autopsy, ImageJ…) sugeridos conforme o caso, sempre com fonte." },
  { icon: FileSignature, title: "Rascunho de laudo", text: "Organiza o que está registrado e marca [PREENCHER] onde falta informação." }
];

export default async function AssistantPage() {
  const session = await getSession();
  const cases = await prisma.case.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, code: true, name: true } });
  const canEdit = session?.role === "ADMIN" || session?.role === "PERITO";
  return (
    <div>
      <PageHeader eyebrow="Watson" title="Assistente Watson" description="Conselheiro de investigação: organiza o que o perito registrou, aponta lacunas e compara com a biblioteca, sem acrescentar fatos." />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <WatsonPanel cases={cases} canEdit={canEdit} />
        <aside className="space-y-3">
          {POWERS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card flex gap-3 p-4"><Icon size={18} className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true" /><div><h3 className="text-sm font-semibold text-gray-900">{title}</h3><p className="mt-0.5 text-xs leading-relaxed text-gray-500">{text}</p></div></div>
          ))}
          <Link href="/library" className="btn-secondary w-full"><BookOpen size={15} aria-hidden="true" /> Abrir a Biblioteca</Link>
        </aside>
      </div>
    </div>
  );
}
