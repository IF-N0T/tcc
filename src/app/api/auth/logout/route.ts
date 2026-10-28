import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  if (session) {
    await prisma.user.update({ where: { id: session.sub }, data: { leftAt: new Date() } }).catch(() => null);
    await logAudit({ userId: session.sub, action: "LOGOUT", entityType: "User", entityId: session.sub });
  }
  cookies().delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
