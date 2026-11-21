import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true, role: true, active: true, sessionVersion: true, mustChangePassword: true }
  });
  if (!user || !user.active || user.sessionVersion !== payload.sessionVersion || user.role !== payload.role) return null;
  return {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
    mustChangePassword: user.mustChangePassword
  };
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Response(JSON.stringify({ error: "Não autenticado" }), { status: 401 });
  }
  return session;
}

export function requireRole(session: SessionPayload, roles: SessionPayload["role"][]) {
  if (!roles.includes(session.role)) {
    throw new Response(JSON.stringify({ error: "Permissão insuficiente para esta ação" }), { status: 403 });
  }
}
