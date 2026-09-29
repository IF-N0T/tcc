import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionPayload } from "./auth";

export async function getSession(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
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
