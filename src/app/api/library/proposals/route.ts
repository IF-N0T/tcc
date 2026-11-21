import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN"]); } catch (r) { return r as Response; }

  const proposals = await prisma.knowledgeProposal.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, summary: true, content: true, tags: true, appliesTo: true, createdAt: true }
  });
  return NextResponse.json(proposals);
}
