import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearFailures, registerFailure, tooManyAttempts } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de login inválidos" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const throttleKey = `${email.toLowerCase()}|${ip}`;
  if (tooManyAttempts(throttleKey)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    registerFailure(throttleKey);
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    registerFailure(throttleKey);
    return NextResponse.json({ error: "Credenciais inválidas" }, { status: 401 });
  }
  if (!user.active) {
    return NextResponse.json({ error: "Conta desativada. Procure um administrador." }, { status: 403 });
  }
  clearFailures(throttleKey);
  const now = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now, lastSeenAt: now, leftAt: null } });

  const token = await signSession({ sub: user.id, name: user.name, email: user.email, role: user.role });

  await logAudit({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/"
  });
  return res;
}
