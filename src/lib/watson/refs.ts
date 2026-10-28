import type { SourceRef } from "./types";

const TAB: Record<string, string> = {
  "Evidência": "evidence", "Dispositivo": "people", "Pessoa": "people", "Achado": "findings",
  "Análise": "analyses", "Tarefa": "tasks", "Nota": "notes", "Importação": "analyses", "Caso": "overview"
};

export function ref(kind: string, code: string, caseId: string): SourceRef {
  return { kind, code, caseId, href: `/cases/${caseId}#${TAB[kind] ?? "overview"}` };
}
