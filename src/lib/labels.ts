// Rótulos legíveis compartilhados entre telas, exportações e o Watson.

export const STATUS_LABEL: Record<string, string> = {
  EM_ANALISE: "Em análise",
  AGUARDANDO_EVIDENCIAS: "Aguardando evidências",
  EM_ELABORACAO_LAUDO: "Em elaboração de laudo",
  CONCLUIDO: "Concluído",
  ARQUIVADO: "Arquivado"
};

export const PRIORITY_LABEL: Record<string, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica"
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída"
};

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  PERITO: "Perito",
  VISUALIZADOR: "Visualizador"
};

export const CATEGORY_LABEL: Record<string, string> = {
  FISICA: "Física",
  DIGITAL: "Digital"
};

export const EVIDENCE_TYPE_LABEL: Record<string, string> = {
  SMARTPHONE: "Smartphone",
  NOTEBOOK: "Notebook",
  COMPUTADOR: "Computador",
  HD: "HD",
  SSD: "SSD",
  PENDRIVE: "Pendrive",
  CARTAO_MEMORIA: "Cartão de memória",
  OUTRO_FISICO: "Outro (físico)",
  IMAGEM_FORENSE: "Imagem forense",
  ARQUIVO: "Arquivo",
  BANCO_DADOS: "Banco de dados",
  LOG: "Log",
  EMAIL: "E-mail",
  DOCUMENTO: "Documento",
  CONVERSA: "Conversa",
  METADADOS: "Metadados",
  OUTRO_DIGITAL: "Outro (digital)"
};

export const ALGORITHM_LABEL: Record<string, string> = {
  MD5: "MD5",
  SHA1: "SHA-1",
  SHA256: "SHA-256"
};

export const ENTITY_LABEL: Record<string, string> = {
  Person: "Pessoa",
  Device: "Dispositivo",
  Evidence: "Evidência",
  Finding: "Achado",
  CaseEvent: "Evento",
  Case: "Caso",
  Analysis: "Análise",
  Task: "Tarefa"
};

export const SEVERITY_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  info: "Informativa"
};

export const label = (map: Record<string, string>, key: string | null | undefined, fallback = "—") =>
  key ? map[key] ?? key : fallback;
