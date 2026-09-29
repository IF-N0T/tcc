import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  type: z.string(),
  personId: z.string().optional().or(z.literal("")),
  brand: z.string().optional(),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  imei: z.string().optional(),
  macAddress: z.string().optional(),
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

  const code = await generateCode("DEV");
  const device = await prisma.device.create({
    data: {
      ...parsed.data,
      type: parsed.data.type as any,
      personId: parsed.data.personId || undefined,
      code,
      caseId: params.id
    }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_DISPOSITIVO", entityType: "Device", entityId: device.id, details: device.code });

  return NextResponse.json(device, { status: 201 });
}
