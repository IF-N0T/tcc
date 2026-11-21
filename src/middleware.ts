import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/robots.txt", "/api/auth/login"];
const PASSWORD_CHANGE_PATHS = ["/change-password", "/api/auth/change-password", "/api/auth/logout"];
const PUBLIC_ASSET_PATH = /\.(?:avif|gif|jpe?g|png|svg|webp|ico|woff2?|ttf|otf)$/i;

function isMutation(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function hasSameOrigin(req: NextRequest) {
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false;
  try {
    const sourceUrl = new URL(source);
    const requestHost = req.headers.get("host")?.toLowerCase();
    const urlHost = req.nextUrl.host.toLowerCase();
    return sourceUrl.host.toLowerCase() === urlHost &&
      (!requestHost || sourceUrl.host.toLowerCase() === requestHost) &&
      (process.env.NODE_ENV !== "production" || sourceUrl.protocol === "https:");
  } catch {
    return false;
  }
}

function makeNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function contentSecurityPolicy(nonce: string) {
  const scripts = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  const connections = ["'self'"];
  if (process.env.NODE_ENV !== "production") {
    scripts.push("'unsafe-eval'");
    connections.push("ws:", "wss:");
  }
  return [
    "default-src 'self'",
    `script-src ${scripts.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connections.join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, policy: string) {
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  return response;
}

function securedNext(req: NextRequest, policy: string, nonce: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", policy);
  requestHeaders.set("x-nonce", nonce);
  return applySecurityHeaders(NextResponse.next({ request: { headers: requestHeaders } }), policy);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const nonce = makeNonce();
  const policy = contentSecurityPolicy(nonce);

  if (isMutation(req.method) && !hasSameOrigin(req)) {
    return applySecurityHeaders(NextResponse.json({ error: "Origem da solicitação não autorizada." }, { status: 403 }), policy);
  }

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_ASSET_PATH.test(pathname) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return securedNext(req, policy, nonce);
  }

  const cookieName = process.env.NODE_ENV === "production" ? "__Host-sherlock_session" : "sherlock_session";
  const token = req.cookies.get(cookieName)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return applySecurityHeaders(NextResponse.json({ error: "Não autenticado" }, { status: 401 }), policy);
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/login", req.url)), policy);
  }

  if (session.mustChangePassword && !PASSWORD_CHANGE_PATHS.includes(pathname)) {
    if (pathname.startsWith("/api")) {
      return applySecurityHeaders(NextResponse.json({ error: "É necessário trocar a senha antes de continuar." }, { status: 403 }), policy);
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/change-password", req.url)), policy);
  }

  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    if (pathname.startsWith("/api")) {
      return applySecurityHeaders(NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 }), policy);
    }
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", req.url)), policy);
  }

  return securedNext(req, policy, nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
