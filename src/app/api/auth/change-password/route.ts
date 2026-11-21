import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import {
  hashPassword,
  signSession,
  verifyPassword,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12, "A nova senha precisa ter ao menos 12 caracteres.").max(128)
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: "A nova senha deve ser diferente da senha atual."
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, passwordHash: true, sessionVersion: true }
  });
  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Senha atual inválida." }, { status: 400 });
  }

  const update = await prisma.user.updateMany({
    where: { id: user.id, sessionVersion: user.sessionVersion },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      sessionVersion: { increment: 1 }
    }
  });
  if (update.count !== 1) {
    return NextResponse.json({ error: "A conta foi alterada em outra sessão. Entre novamente." }, { status: 409 });
  }

  const updatedUser = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, sessionVersion: true, mustChangePassword: true }
  });
  const token = await signSession({
    sub: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: updatedUser.role,
    sessionVersion: updatedUser.sessionVersion,
    mustChangePassword: updatedUser.mustChangePassword
  });

  await logAudit({
    userId: user.id,
    action: "TROCA_SENHA",
    entityType: "User",
    entityId: user.id
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return response;
}
