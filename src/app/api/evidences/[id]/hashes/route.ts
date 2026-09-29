import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  algorithm: z.enum(["MD5", "SHA1", "SHA256"]),
  value: z.string().min(4),
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

  // Registro sempre por INSERT (nunca sobrescreve um hash anterior), preservando o
  // histórico para permitir comparação e detecção de divergência ao longo do caso.
  const hash = await prisma.evidenceHash.create({
    data: { ...parsed.data, evidenceId: params.id, calculatedById: session.sub }
  });

  const previous = await prisma.evidenceHash.findMany({
    where: { evidenceId: params.id, algorithm: parsed.data.algorithm, NOT: { id: hash.id } }
  });
  const divergent = previous.some((p) => p.value !== hash.value);

  await logAudit({
    userId: session.sub,
    action: divergent ? "HASH_REGISTRADO_DIVERGENTE" : "HASH_REGISTRADO",
    entityType: "Evidence",
    entityId: params.id,
    details: `${parsed.data.algorithm}: ${parsed.data.value}`
  });

  return NextResponse.json({ hash, divergent }, { status: 201 });
}
