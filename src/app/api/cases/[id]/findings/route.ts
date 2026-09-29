import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(3),
  description: z.string().min(3),
  type: z.string().optional(),
  evidenceId: z.string().optional().or(z.literal("")),
  notes: z.string().optional()
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const code = await generateCode("ACH");
  const finding = await prisma.finding.create({
    data: { ...parsed.data, evidenceId: parsed.data.evidenceId || undefined, code, caseId: params.id }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_ACHADO", entityType: "Finding", entityId: finding.id, details: finding.code });

  return NextResponse.json(finding, { status: 201 });
}
