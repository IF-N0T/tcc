import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const kase = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      responsible: { select: { id: true, name: true, email: true, role: true } },
      people: true,
      devices: { include: { person: true } },
      evidences: { include: { hashes: true, custodyEvents: true, device: true } },
      findings: true,
      tasks: { include: { assignedTo: { select: { id: true, name: true, email: true, role: true } } } },
      events: true,
      relationships: true,
      analyses: {
        include: {
          tool: true,
          performedBy: { select: { id: true, name: true, email: true, role: true } }
        }
      },
      reports: {
        include: {
          author: { select: { id: true, name: true, email: true, role: true } }
        }
      }
    }
  });
  if (!kase) return NextResponse.json({ error: "Caso não encontrado" }, { status: 404 });

  const backup = JSON.stringify({
    application: "Sherlock",
    backupType: "case",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    case: kase
  });
  if (new TextEncoder().encode(backup).byteLength > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "O backup deste caso excede o limite de 25 MB." }, { status: 413 });
  }

  const safeCode = kase.code.replace(/[^a-zA-Z0-9_-]/g, "_");
  const date = new Date().toISOString().slice(0, 10);
  await logAudit({
    userId: session.sub,
    action: "EXPORTACAO_BACKUP_CASO",
    entityType: "Case",
    entityId: kase.id,
    details: `Backup do caso ${kase.code} antes de exclusão`
  });

  return new NextResponse(backup, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="backup-${safeCode}-${date}.json"`,
      "Cache-Control": "private, no-store"
    }
  });
}
