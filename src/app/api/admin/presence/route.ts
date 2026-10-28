import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { isOnline } from "@/lib/presence";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN"]); } catch (r) { return r as Response; }
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, lastLoginAt: true, lastSeenAt: true, leftAt: true }
  });
  const now = Date.now();
  return NextResponse.json({ now, users: users.map(({ leftAt, ...u }) => ({ ...u, online: u.active && isOnline({ lastSeenAt: u.lastSeenAt, leftAt }, now) })) });
}
