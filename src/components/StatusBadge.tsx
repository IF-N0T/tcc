import clsx from "clsx";

const STYLES: Record<string, string> = {
  EM_ANALISE: "bg-blue-50 text-blue-700 border-blue-200",
  AGUARDANDO_EVIDENCIAS: "bg-amber-50 text-amber-700 border-amber-200",
  EM_ELABORACAO_LAUDO: "bg-purple-50 text-purple-700 border-purple-200",
  CONCLUIDO: "bg-green-50 text-green-700 border-green-200",
  ARQUIVADO: "bg-gray-100 text-gray-600 border-gray-200",
  BAIXA: "bg-gray-100 text-gray-600 border-gray-200",
  MEDIA: "bg-blue-50 text-blue-700 border-blue-200",
  ALTA: "bg-amber-50 text-amber-700 border-amber-200",
  CRITICA: "bg-red-50 text-red-700 border-red-200",
  PENDENTE: "bg-gray-100 text-gray-600 border-gray-200",
  EM_ANDAMENTO: "bg-blue-50 text-blue-700 border-blue-200",
  CONCLUIDA: "bg-green-50 text-green-700 border-green-200"
};

const LABELS: Record<string, string> = {
  EM_ANALISE: "Em análise",
  AGUARDANDO_EVIDENCIAS: "Aguardando evidências",
  EM_ELABORACAO_LAUDO: "Em elaboração de laudo",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado",
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída"
};

export default function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        STYLES[value] ?? "bg-gray-100 text-gray-600 border-gray-200"
      )}
    >
      {LABELS[value] ?? value}
    </span>
  );
}
