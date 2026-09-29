import { prisma } from "./prisma";

type Prefix = "CAS" | "EVD" | "DEV" | "PES" | "ANA" | "ACH" | "DOC";

const MODEL_MAP: Record<Prefix, keyof typeof prisma> = {
  CAS: "case",
  EVD: "evidence",
  DEV: "device",
  PES: "person",
  ANA: "analysis",
  ACH: "finding",
  DOC: "case" // placeholder até o módulo de documentos ser implementado
};

/**
 * Gera identificadores padronizados no formato PREFIXO-ANO-NNNN.
 * Observação: a contagem é feita por consulta ao banco no momento da criação.
 * Em cenários de alta concorrência de escrita, recomenda-se evoluir para uma
 * sequência dedicada no banco (ex.: sequence do PostgreSQL) para eliminar
 * qualquer janela de corrida entre a contagem e a inserção.
 */
export async function generateCode(prefix: Prefix): Promise<string> {
  const year = new Date().getFullYear();
  const modelName = MODEL_MAP[prefix];
  // @ts-expect-error - acesso dinâmico ao client do Prisma pelo nome do model
  const count = await prisma[modelName].count({
    where: { code: { startsWith: `${prefix}-${year}-` } }
  });
  const next = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${next}`;
}
