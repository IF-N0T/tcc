import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: "ADMIN" | "PERITO" | "VISUALIZADOR";
  sessionVersion: number;
  mustChangePassword: boolean;
};

const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-sherlock_session" : "sherlock_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

export function assertJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const normalized = secret?.trim() ?? "";
  const isPlaceholder = /^(replace|change[-_ ]?me|your[-_ ]?secret|example|sample|test)(?:[-_ ]|$)/i.test(normalized);
  if (!secret || secret !== normalized || /\s/.test(secret) || new TextEncoder().encode(secret).length < 32 || isPlaceholder) {
    throw new Error("JWT_SECRET inválido. Configure um segredo aleatório com pelo menos 32 bytes; valores de exemplo não são aceitos.");
  }
  return secret;
}

function getSecret() {
  return new TextEncoder().encode(assertJwtSecret());
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SESSION_MAX_AGE,
  path: "/"
};
