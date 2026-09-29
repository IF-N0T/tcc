import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { generateCode } from "@/lib/ids";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2),
  role: z.string().optional(),
  document: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
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

  const code = await generateCode("PES");
  const person = await prisma.person.create({
    data: { ...parsed.data, email: parsed.data.email || undefined, code, caseId: params.id }
  });

  await logAudit({ userId: session.sub, action: "CRIACAO_PESSOA", entityType: "Person", entityId: person.id, details: person.code });

  return NextResponse.json(person, { status: 201 });
}
