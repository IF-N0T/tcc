import clsx from "clsx";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_STATUS_LABEL } from "@/lib/labels";

const VARIANT: Record<string, string> = {
  EM_ANALISE: "badge-blue", AGUARDANDO_EVIDENCIAS: "badge-amber", EM_ELABORACAO_LAUDO: "badge-violet", CONCLUIDO: "badge-green", ARQUIVADO: "badge-neutral",
  BAIXA: "badge-neutral", MEDIA: "badge-blue", ALTA: "badge-amber", CRITICA: "badge-red",
  PENDENTE: "badge-neutral", EM_ANDAMENTO: "badge-blue", CONCLUIDA: "badge-green"
};
const LABELS: Record<string, string> = { ...STATUS_LABEL, ...PRIORITY_LABEL, ...TASK_STATUS_LABEL };

export default function StatusBadge({ value }: { value: string }) {
  return <span className={clsx("badge", VARIANT[value] ?? "badge-neutral")}>{LABELS[value] ?? value}</span>;
}
