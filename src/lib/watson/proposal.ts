import type { CaseData } from "../case-types";
import type { GapCode } from "./types";
import { detectGaps } from "./gaps";

const LESSONS: Record<GapCode, string> = {
  GAP_HASH_AUSENTE: "Calcular e registrar o hash das evidências digitais antes e depois da cópia.",
  GAP_HASH_FRACO: "Registrar SHA-256 junto de algoritmos legados, quando o procedimento aplicável permitir.",
  GAP_HASH_DIVERGENTE: "Preservar todos os valores divergentes e documentar a investigação da diferença.",
  GAP_CUSTODIA_AUSENTE: "Registrar o recebimento inicial e as movimentações de cada evidência.",
  GAP_CUSTODIA_ELO: "Conferir a continuidade entre quem entrega e quem recebe em cada movimentação.",
  GAP_CUSTODIA_DADOS: "Registrar local, responsáveis, horário e motivo em cada evento de custódia.",
  GAP_COLETA_INCOMPLETA: "Conferir se a documentação de coleta contém data, local e origem.",
  GAP_EVIDENCIA_SEM_ANALISE: "Registrar a análise da evidência ou justificar por que ela não foi examinada.",
  GAP_ANALISE_SEM_FERRAMENTA: "Registrar ferramenta e versão para permitir revisão e reprodução.",
  GAP_ANALISE_SEM_CONCLUSAO: "Documentar resultados observados e conclusão, distinguindo-os claramente.",
  GAP_ANALISE_ANTES_COLETA: "Revisar coerência temporal e fuso entre coleta, custódia e análise.",
  GAP_ACHADO_SEM_EVIDENCIA: "Vincular cada achado à evidência ou fonte que o sustenta.",
  GAP_DISPOSITIVO_SEM_ID: "Conferir identificadores disponíveis e documentar os que não puderam ser obtidos.",
  GAP_IMEI_INVALIDO: "Validar identificadores de dispositivos móveis e registrar a fonte da leitura.",
  GAP_DISPOSITIVO_SEM_PESSOA: "Documentar a associação entre dispositivo e pessoa somente quando houver suporte verificável.",
  GAP_SEM_RELACIONAMENTOS: "Revisar se relações relevantes entre entidades foram registradas com suas fontes.",
  GAP_SEM_LINHA_TEMPO: "Conferir se eventos relevantes têm data, horário e fuso documentados.",
  GAP_TAREFA_VENCIDA: "Revisar tarefas e prazos pendentes antes do encerramento.",
  GAP_CASO_ENCERRADO_PENDENCIAS: "Conferir pendências e justificar itens não concluídos antes de encerrar.",
  GAP_CASO_SEM_DESCRICAO: "Registrar escopo e contexto do caso de forma objetiva.",
  GAP_EVIDENCIA_DUPLICADA_HASH: "Revisar hashes repetidos e documentar se representam cópias ou itens distintos.",
  GAP_NOTA_DADO_NAO_CADASTRADO: "Conferir dados citados nas notas e vinculá-los aos registros correspondentes.",
  GAP_NOTA_TIPO_NAO_CADASTRADO: "Conferir se tipos de mídia mencionados nas notas foram inventariados.",
  GAP_NOTA_FERRAMENTA_SEM_ANALISE: "Vincular ferramentas mencionadas no diário às análises correspondentes."
};

export function buildKnowledgeProposal(data: CaseData) {
  const lessonLines = [...new Set(detectGaps({ ...data, status: "CONCLUIDO" }).map((gap) => LESSONS[gap.code]))].sort();
  const checklist = lessonLines.length
    ? lessonLines.map((lesson) => `- [ ] ${lesson}`).join("\n")
    : [
        "- [ ] Conferir identificação e integridade das evidências.",
        "- [ ] Revisar cadeia de custódia e vínculos entre achados e fontes.",
        "- [ ] Registrar metodologia, resultados, limitações e pendências.",
        "- [ ] Verificar tarefas e documentação antes do encerramento."
      ].join("\n");

  return {
    title: "Checklist de encerramento e revisão forense",
    summary: "Proposta de checklist genérico para revisão de registros antes do encerramento de casos.",
    content: `Esta proposta contém recomendações genéricas derivadas de categorias de revisão. Não inclui identificadores, nomes, dados brutos ou conclusões do caso de origem.\n\n${checklist}\n\nRevise a pertinência de cada item e confirme os procedimentos e normas aplicáveis antes de aprovar.`,
    tags: "encerramento, revisão, integridade, cadeia de custódia",
    appliesTo: "CONCLUIDO,EM_ELABORACAO_LAUDO"
  };
}
