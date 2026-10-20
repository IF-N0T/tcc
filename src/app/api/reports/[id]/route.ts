import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

async function getReportData(caseId: string) {
  return prisma.case.findUnique({
    where: { id: caseId },
    include: {
      responsible: { select: { name: true, email: true } },
      people: true,
      devices: { include: { person: { select: { name: true } } } },
      evidences: { include: { hashes: true, custodyEvents: true, findings: true } },
      findings: true,
      tasks: { include: { assignedTo: { select: { name: true } } } },
      events: true,
      analyses: { include: { evidence: { select: { code: true, description: true } }, performedBy: { select: { name: true } }, tool: true } },
      relationships: true
    }
  });
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const caseRecord = await getReportData(params.id);
  if (!caseRecord) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });
  return NextResponse.json(caseRecord, {
    headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="${caseRecord.code}.json"` }
  });
}

const saveSchema = z.object({
  title: z.string().trim().min(2).max(160),
  format: z.enum(["JSON", "CSV", "HTML"])
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um título e um formato válidos." }, { status: 400 });
  const caseRecord = await getReportData(params.id);
  if (!caseRecord) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  const version = await prisma.caseReport.count({ where: { caseId: caseRecord.id } }).then((count) => count + 1);
  const report = await prisma.caseReport.create({
    data: {
      caseId: caseRecord.id,
      authorId: session.sub,
      version,
      title: parsed.data.title,
      format: parsed.data.format,
      content: JSON.stringify(caseRecord)
    },
    select: { id: true, version: true, title: true, format: true, createdAt: true }
  });

  await logAudit({
    userId: session.sub,
    action: "CRIACAO_VERSAO_RELATORIO",
    entityType: "CaseReport",
    entityId: report.id,
    details: `${caseRecord.code} · v${report.version} · ${report.format}`
  });
  return NextResponse.json(report, { status: 201 });
}
