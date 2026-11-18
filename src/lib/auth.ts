import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string;
  name: string;
  email: string;
  role: "ADMIN" | "PERITO" | "VISUALIZADOR";
};

const SESSION_COOKIE = "sherlock_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado. Defina essa variável de ambiente antes de iniciar o Sherlock.");
  }
  return new TextEncoder().encode(secret);
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
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    if (
      typeof payload.sub !== "string" || !payload.sub ||
      typeof payload.name !== "string" || !payload.name ||
      typeof payload.email !== "string" || !payload.email ||
      (payload.role !== "ADMIN" && payload.role !== "PERITO" && payload.role !== "VISUALIZADOR")
    ) return null;
    return { sub: payload.sub, name: payload.name, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
