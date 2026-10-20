import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { readJsonBody } from "@/lib/request";

export const dynamic = "force-dynamic";

const backupSchema = z.object({
  application: z.literal("Sherlock"),
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  data: z.record(z.array(z.record(z.unknown())))
});

const MODEL_KEYS = {
  users: ["id", "name", "email", "passwordHash", "role", "createdAt"],
  cases: ["id", "code", "name", "description", "status", "priority", "openedAt", "closedAt", "responsibleId", "notes", "createdAt", "updatedAt"],
  people: ["id", "code", "caseId", "name", "role", "document", "email", "phone", "notes", "createdAt"],
  devices: ["id", "code", "caseId", "personId", "type", "brand", "model", "serialNumber", "imei", "macAddress", "notes", "createdAt"],
  evidences: ["id", "code", "caseId", "category", "type", "description", "origin", "collectedAt", "collectedById", "collectionPlace", "state", "size", "format", "serialNumber", "technicalIds", "notes", "deviceId", "createdAt", "updatedAt"],
  evidenceHashes: ["id", "evidenceId", "algorithm", "value", "calculatedAt", "calculatedById", "notes"],
  custodyEvents: ["id", "evidenceId", "action", "fromCustodian", "toCustodian", "location", "reason", "occurredAt", "registeredById", "notes", "createdAt"],
  tools: ["id", "name", "vendor", "version"],
  analyses: ["id", "code", "caseId", "evidenceId", "type", "toolId", "performedById", "procedure", "result", "conclusion", "performedAt", "createdAt"],
  caseReports: ["id", "caseId", "authorId", "version", "title", "format", "content", "createdAt"],
  findings: ["id", "code", "caseId", "title", "description", "type", "identifiedAt", "evidenceId", "analysisId", "notes", "createdAt"],
  caseEvents: ["id", "caseId", "title", "description", "category", "occurredAt", "createdAt"],
  relationships: ["id", "caseId", "sourceType", "sourceId", "targetType", "targetId", "label", "createdAt"],
  tasks: ["id", "caseId", "title", "status", "assignedToId", "evidenceId", "findingId", "dueDate", "createdAt"],
  auditLogs: ["id", "userId", "action", "entityType", "entityId", "details", "createdAt"]
} as const;

type BackupTable = keyof typeof MODEL_KEYS;
type BackupRow = Record<string, unknown>;

const REQUIRED_FIELDS: Record<BackupTable, string[]> = {
  users: ["id", "name", "email", "passwordHash", "role"],
  cases: ["id", "code", "name", "status", "priority", "responsibleId"],
  people: ["id", "code", "caseId", "name"],
  devices: ["id", "code", "caseId", "type"],
  evidences: ["id", "code", "caseId", "category", "type", "description"],
  evidenceHashes: ["id", "evidenceId", "algorithm", "value", "calculatedById"],
  custodyEvents: ["id", "evidenceId", "action", "toCustodian", "registeredById"],
  tools: ["id", "name"],
  analyses: ["id", "code", "caseId", "evidenceId", "type", "performedById"],
  caseReports: ["id", "caseId", "authorId", "version", "title", "format", "content"],
  findings: ["id", "code", "caseId", "title", "description"],
  caseEvents: ["id", "caseId", "title", "occurredAt"],
  relationships: ["id", "caseId", "sourceType", "sourceId", "targetType", "targetId"],
  tasks: ["id", "caseId", "title", "status"],
  auditLogs: ["id", "action", "entityType"]
};

const DATE_FIELDS = new Set([
  "createdAt", "updatedAt", "openedAt", "closedAt", "collectedAt", "calculatedAt",
  "occurredAt", "performedAt", "identifiedAt", "dueDate"
]);

function normalizeRows(rows: BackupRow[], table: BackupTable): BackupRow[] {
  return rows.map((row) => {
    for (const field of REQUIRED_FIELDS[table]) {
      if (!(field in row) || row[field] === null || row[field] === "") {
        throw new Error(`Campo obrigatório ausente em ${table}: ${field}.`);
      }
    }
    const allowed = MODEL_KEYS[table] as readonly string[];
    const normalized: BackupRow = {};
    for (const field of allowed) {
      const value = row[field];
      if (value === undefined) continue;
      if (DATE_FIELDS.has(field)) {
        if (value === null) {
          normalized[field] = null;
        } else if (typeof value === "string" && Number.isFinite(Date.parse(value))) {
          normalized[field] = new Date(value);
        } else {
          throw new Error(`Data inválida em ${table}.${field}.`);
        }
      } else if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        normalized[field] = value;
      } else {
        throw new Error(`Valor inválido em ${table}.${field}.`);
      }
    }
    return normalized;
  });
}

function rows<T>(data: Partial<Record<BackupTable, BackupRow[]>>, table: BackupTable): T[] {
  return (data[table] ?? []) as T[];
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN"]);
  } catch (response) {
    return response as Response;
  }

  const [
    users, cases, people, devices, evidences, evidenceHashes, custodyEvents, tools,
    analyses, caseReports, findings, caseEvents, relationships, tasks, auditLogs
  ] = await Promise.all([
    prisma.user.findMany(), prisma.case.findMany(), prisma.person.findMany(), prisma.device.findMany(),
    prisma.evidence.findMany(), prisma.evidenceHash.findMany(), prisma.custodyEvent.findMany(),
    prisma.tool.findMany(), prisma.analysis.findMany(), prisma.caseReport.findMany(), prisma.finding.findMany(),
    prisma.caseEvent.findMany(), prisma.relationship.findMany(), prisma.task.findMany(), prisma.auditLog.findMany()
  ]);

  const backup = {
    application: "Sherlock",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: { users, cases, people, devices, evidences, evidenceHashes, custodyEvents, tools, analyses, caseReports, findings, caseEvents, relationships, tasks, auditLogs }
  };
  const serializedBackup = JSON.stringify(backup);
  if (new TextEncoder().encode(serializedBackup).byteLength > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "O backup excede o limite de 25 MB e não pode ser exportado em um único arquivo." }, { status: 413 });
  }
  const date = new Date().toISOString().slice(0, 10);
  await logAudit({ userId: session.sub, action: "EXPORTACAO_BACKUP", entityType: "Backup", details: date });

  return new NextResponse(serializedBackup, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sherlock-backup-${date}.json"`,
      "Cache-Control": "private, no-store"
    }
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN"]);
  } catch (response) {
    return response as Response;
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "O arquivo de backup excede o limite de 25 MB." }, { status: 413 });
  }
  const body = await readJsonBody(request, 25 * 1024 * 1024);
  if (body.error === "too-large") {
    return NextResponse.json({ error: "O arquivo de backup excede o limite de 25 MB." }, { status: 413 });
  }
  const parsed = backupSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json({ error: "Arquivo inválido. Selecione um backup Sherlock versão 1." }, { status: 400 });
  }

  const unknownTables = Object.keys(parsed.data.data).filter((key) => !(key in MODEL_KEYS));
  if (unknownTables.length) {
    return NextResponse.json({ error: `O backup contém tabelas desconhecidas: ${unknownTables.join(", ")}.` }, { status: 400 });
  }

  let normalized: Partial<Record<BackupTable, BackupRow[]>>;
  try {
    normalized = Object.fromEntries(
      Object.entries(parsed.data.data).map(([table, data]) => [
        table,
        normalizeRows(data, table as BackupTable)
      ])
    ) as Partial<Record<BackupTable, BackupRow[]>>;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dados de backup inválidos." }, { status: 400 });
  }

  try {
    const restored = await prisma.$transaction(async (tx) => {
      const counts: Record<string, number> = {};
      const save = async (table: string, result: { count: number }) => { counts[table] = result.count; };
      await save("users", await tx.user.createMany({ data: rows<Prisma.UserCreateManyInput>(normalized, "users"), skipDuplicates: true }));
      await save("cases", await tx.case.createMany({ data: rows<Prisma.CaseCreateManyInput>(normalized, "cases"), skipDuplicates: true }));
      await save("people", await tx.person.createMany({ data: rows<Prisma.PersonCreateManyInput>(normalized, "people"), skipDuplicates: true }));
      await save("devices", await tx.device.createMany({ data: rows<Prisma.DeviceCreateManyInput>(normalized, "devices"), skipDuplicates: true }));
      await save("evidences", await tx.evidence.createMany({ data: rows<Prisma.EvidenceCreateManyInput>(normalized, "evidences"), skipDuplicates: true }));
      await save("evidenceHashes", await tx.evidenceHash.createMany({ data: rows<Prisma.EvidenceHashCreateManyInput>(normalized, "evidenceHashes"), skipDuplicates: true }));
      await save("custodyEvents", await tx.custodyEvent.createMany({ data: rows<Prisma.CustodyEventCreateManyInput>(normalized, "custodyEvents"), skipDuplicates: true }));
      await save("tools", await tx.tool.createMany({ data: rows<Prisma.ToolCreateManyInput>(normalized, "tools"), skipDuplicates: true }));
      await save("analyses", await tx.analysis.createMany({ data: rows<Prisma.AnalysisCreateManyInput>(normalized, "analyses"), skipDuplicates: true }));
      await save("caseReports", await tx.caseReport.createMany({ data: rows<Prisma.CaseReportCreateManyInput>(normalized, "caseReports"), skipDuplicates: true }));
      await save("findings", await tx.finding.createMany({ data: rows<Prisma.FindingCreateManyInput>(normalized, "findings"), skipDuplicates: true }));
      await save("caseEvents", await tx.caseEvent.createMany({ data: rows<Prisma.CaseEventCreateManyInput>(normalized, "caseEvents"), skipDuplicates: true }));
      await save("relationships", await tx.relationship.createMany({ data: rows<Prisma.RelationshipCreateManyInput>(normalized, "relationships"), skipDuplicates: true }));
      await save("tasks", await tx.task.createMany({ data: rows<Prisma.TaskCreateManyInput>(normalized, "tasks"), skipDuplicates: true }));
      await save("auditLogs", await tx.auditLog.createMany({ data: rows<Prisma.AuditLogCreateManyInput>(normalized, "auditLogs"), skipDuplicates: true }));
      return counts;
    }, { maxWait: 10000, timeout: 60000 });

    const total = Object.values(restored).reduce((sum, count) => sum + count, 0);
    await logAudit({
      userId: session.sub,
      action: "RESTAURACAO_ADITIVA_BACKUP",
      entityType: "Backup",
      details: `${total} registro(s) restaurado(s)`
    });
    return NextResponse.json({ restored, total });
  } catch (error) {
    console.error("Backup restoration failed:", error);
    return NextResponse.json({
      error: "A restauração foi cancelada. Nenhum dado foi parcialmente aplicado; verifique se o backup pertence a um banco compatível."
    }, { status: 400 });
  }
}
