export type Severity = "alta" | "media" | "baixa" | "info";

export type SourceRef = {
  kind: string;      // Caso, Evidência, Análise, Achado, Dispositivo, Pessoa, Nota, Tarefa, Importação, Biblioteca
  code: string;
  caseId?: string;
  href?: string;
};

export type GapCode =
  | "GAP_HASH_AUSENTE" | "GAP_HASH_FRACO" | "GAP_HASH_DIVERGENTE"
  | "GAP_CUSTODIA_AUSENTE" | "GAP_CUSTODIA_ELO" | "GAP_CUSTODIA_DADOS"
  | "GAP_COLETA_INCOMPLETA" | "GAP_EVIDENCIA_SEM_ANALISE"
  | "GAP_ANALISE_SEM_FERRAMENTA" | "GAP_ANALISE_SEM_CONCLUSAO" | "GAP_ANALISE_ANTES_COLETA"
  | "GAP_ACHADO_SEM_EVIDENCIA"
  | "GAP_DISPOSITIVO_SEM_ID" | "GAP_IMEI_INVALIDO" | "GAP_DISPOSITIVO_SEM_PESSOA"
  | "GAP_SEM_RELACIONAMENTOS" | "GAP_SEM_LINHA_TEMPO" | "GAP_TAREFA_VENCIDA"
  | "GAP_CASO_ENCERRADO_PENDENCIAS" | "GAP_CASO_SEM_DESCRICAO" | "GAP_EVIDENCIA_DUPLICADA_HASH"
  | "GAP_NOTA_DADO_NAO_CADASTRADO" | "GAP_NOTA_TIPO_NAO_CADASTRADO" | "GAP_NOTA_FERRAMENTA_SEM_ANALISE";

export type Gap = {
  id: string;                 // estável: código + entidade
  code: GapCode;
  severity: Severity;
  title: string;
  detail: string;             // sempre descreve o que foi observado nos registros
  sources: SourceRef[];
  suggestion?: string;        // o que o perito pode fazer (não é um fato)
  task?: string;              // título sugerido para tarefa
};

export type TraceStep = {
  at: string | null;          // ISO
  kind: string;
  code: string;
  text: string;
  source: SourceRef;
};

export type Block =
  | { type: "text"; text: string; tone?: "info" | "warn" | "ok" }
  | { type: "list"; title?: string; items: { text: string; sources?: SourceRef[] }[] }
  | { type: "table"; title?: string; columns: string[]; rows: string[][]; note?: string }
  | { type: "gaps"; title?: string; caseId: string; items: Gap[] }
  | { type: "trace"; title: string; origin: TraceStep[]; after: TraceStep[]; undated: TraceStep[]; missing: string[] }
  | { type: "advice"; title?: string; items: { id: string; title: string; category: string; summary: string; content: string; source: string | null; reason: string }[] }
  | { type: "draft"; title: string; text: string }
  | { type: "matches"; title?: string; items: { kind: string; code: string; title: string; detail: string; caseId: string; caseCode: string }[] }
  | { type: "suggestions"; items: string[] };

export type WatsonResponse = { intent: string; blocks: Block[]; caseId?: string };
