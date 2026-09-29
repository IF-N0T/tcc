import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  action: z.string().min(2),
  fromCustodian: z.string().optional(),
  toCustodian: z.string().min(2),
  location: z.string().optional(),
  reason: z.string().optional(),
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

  // A cadeia de custódia é somente-append: eventos antigos nunca são editados
  // ou removidos por esta API, garantindo o histórico cronológico rastreável.
  const event = await prisma.custodyEvent.create({
    data: { ...parsed.data, evidenceId: params.id, registeredById: session.sub }
  });

  await logAudit({
    userId: session.sub,
    action: "EVENTO_CUSTODIA",
    entityType: "Evidence",
    entityId: params.id,
    details: `${parsed.data.action} -> ${parsed.data.toCustodian}`
  });

  return NextResponse.json(event, { status: 201 });
}
