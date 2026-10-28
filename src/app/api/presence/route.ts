import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Sinal de vida (a cada ~45 s com a aba visível) e saída explícita (?leave=1 via sendBeacon).
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { active: true } });
  if (!user || !user.active) {
    const res = NextResponse.json({ error: "Conta desativada." }, { status: 403 });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }
  const leaving = request.nextUrl.searchParams.get("leave") === "1";
  await prisma.user.update({ where: { id: session.sub }, data: leaving ? { leftAt: new Date() } : { lastSeenAt: new Date() } });
  return NextResponse.json({ ok: true });
}
