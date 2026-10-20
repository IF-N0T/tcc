import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: z.enum(["ADMIN", "PERITO", "VISUALIZADOR"]),
  password: z.string().min(12).max(128)
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN"]);
  } catch (response) {
    return response as Response;
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true }
  })) {
    return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      passwordHash: await hashPassword(parsed.data.password)
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true }
  });

  await logAudit({
    userId: session.sub,
    action: "CRIACAO_USUARIO",
    entityType: "User",
    entityId: user.id,
    details: `${user.email} · ${user.role}`
  });

  return NextResponse.json(user, { status: 201 });
}
