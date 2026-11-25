import type { User } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearFailures, registerFailure, tooManyAttempts } from "@/lib/ratelimit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});
const DUMMY_PASSWORD_HASH = "$2a$12$ow79KTCNz3spLG16R1kdC.xlECHqDhgoObdZDBZ8Wqu6Wjkq3oSdy";
const INVALID_CREDENTIALS = "E-mail ou senha inválidos.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    await verifyPassword("", DUMMY_PASSWORD_HASH);
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }

  const { email, password } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const throttleKey = `${email.toLowerCase()}|${ip}`;
  if (tooManyAttempts(throttleKey)) {
    return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 });
  }

  let user: User | null;
  try {
    user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  } catch (error) {
    if (error instanceof Error && error.name === "PrismaClientInitializationError") {
      return NextResponse.json({ error: "Banco de dados indisponível. Verifique a conexão do servidor e tente novamente." }, { status: 503 });
    }
    throw error;
  }
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !valid || !user.active) {
    registerFailure(throttleKey);
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
  }
  clearFailures(throttleKey);
  const now = new Date();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: now, lastSeenAt: now, leftAt: null } });

  const token = await signSession({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword
  });

  await logAudit({ userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id });

  const res = NextResponse.json({ ok: true, mustChangePassword: user.mustChangePassword });
  res.cookies.set(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  return res;
}
