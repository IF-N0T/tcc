import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { safeFilename } from "@/lib/text";

export const dynamic = "force-dynamic";
const LIB_CATEGORIES = ["PROCEDIMENTO", "FERRAMENTA", "CHECKLIST", "NORMA", "ALERTA", "GLOSSARIO", "MODELO_TEXTO"] as const;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const category = request.nextUrl.searchParams.get("category");
  const items = await prisma.knowledgeEntry.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(q ? { OR: ["title", "summary", "content", "tags"].map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } })) } : {})
    },
    orderBy: [{ category: "asc" }, { title: "asc" }]
  });
  return NextResponse.json(items);
}

const schema = z.object({
  title: z.string().trim().min(3).max(160),
  category: z.enum(LIB_CATEGORIES),
  summary: z.string().trim().min(3).max(300),
  content: z.string().trim().min(3).max(20000),
  tags: z.string().trim().max(300).optional().default(""),
  appliesTo: z.string().trim().max(300).optional().default(""),
  source: z.string().trim().max(300).optional().nullable()
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN", "PERITO"]); } catch (r) { return r as Response; }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const base = safeFilename(parsed.data.title).toLowerCase().slice(0, 60) || "item";
  let slug = `usuario-${base}`;
  for (let i = 2; await prisma.knowledgeEntry.findUnique({ where: { slug } }); i++) slug = `usuario-${base}-${i}`;
  const entry = await prisma.knowledgeEntry.create({ data: { ...parsed.data, source: parsed.data.source || null, slug, builtIn: false, authorId: session.sub } });
  await logAudit({ userId: session.sub, action: "CRIACAO_ITEM_BIBLIOTECA", entityType: "KnowledgeEntry", entityId: entry.id, details: entry.title });
  return NextResponse.json(entry, { status: 201 });
}
