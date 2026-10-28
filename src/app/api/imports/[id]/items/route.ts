import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") ?? 0) || 0);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const where = { importId: params.id, ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { path: { contains: q, mode: "insensitive" as const } }, { md5: { equals: q.toLowerCase() } }, { sha1: { equals: q.toLowerCase() } }, { sha256: { equals: q.toLowerCase() } }] } : {}) };
  const [items, total] = await Promise.all([
    prisma.importedItem.findMany({ where, skip: offset, take: 100, orderBy: { id: "asc" }, select: { id: true, name: true, path: true, size: true, md5: true, sha1: true, sha256: true, modifiedAt: true, mime: true } }),
    prisma.importedItem.count({ where })
  ]);
  return NextResponse.json({ items, total });
}
