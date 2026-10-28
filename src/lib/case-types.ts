// Formato único dos dados de um caso, usado por exportações e pelo Watson.
// Estruturalmente compatível com o retorno do Prisma (Date ou string ISO).
type D = Date | string;

export type CaseData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  openedAt: D;
  closedAt: D | null;
  notes: string | null;
  responsible: { name: string; email: string };
  userNames: Record<string, string>;
  people: { id: string; code: string; name: string; role: string | null; document: string | null; email: string | null; phone: string | null; notes: string | null; createdAt: D }[];
  devices: { id: string; code: string; personId: string | null; type: string; brand: string | null; model: string | null; serialNumber: string | null; imei: string | null; macAddress: string | null; notes: string | null; createdAt: D }[];
  evidences: {
    id: string; code: string; category: string; type: string; description: string; origin: string | null;
    collectedAt: D | null; collectedById: string | null; collectionPlace: string | null; state: string | null;
    size: string | null; format: string | null; serialNumber: string | null; technicalIds: string | null; notes: string | null;
    deviceId: string | null; createdAt: D;
    hashes: { id: string; algorithm: string; value: string; calculatedAt: D; calculatedById: string; notes: string | null }[];
    custodyEvents: { id: string; action: string; fromCustodian: string | null; toCustodian: string; location: string | null; reason: string | null; occurredAt: D; registeredById: string; notes: string | null }[];
  }[];
  findings: { id: string; code: string; title: string; description: string; type: string | null; identifiedAt: D; evidenceId: string | null; analysisId: string | null; notes: string | null }[];
  analyses: { id: string; code: string; evidenceId: string; type: string; toolId: string | null; tool: { name: string; version: string | null } | null; performedBy: { name: string }; procedure: string | null; result: string | null; conclusion: string | null; performedAt: D }[];
  tasks: { id: string; title: string; status: string; dueDate: D | null; evidenceId: string | null; findingId: string | null; assignedTo: { name: string } | null; createdAt: D }[];
  events: { id: string; title: string; description: string | null; category: string | null; occurredAt: D }[];
  relationships: { id: string; sourceType: string; sourceId: string; targetType: string; targetId: string; label: string | null }[];
  caseNotes: { id: string; text: string; createdAt: D; author: { name: string } }[];
  imports: { id: string; source: string; filename: string; rowCount: number; summary: string | null; createdAt: D; evidenceId: string | null; tool: { name: string } | null; importedBy: { name: string } }[];
};
