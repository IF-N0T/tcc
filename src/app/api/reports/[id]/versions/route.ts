import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const reports = await prisma.caseReport.findMany({
    where: { caseId: params.id },
    orderBy: { version: "desc" },
    take: 50,
    select: {
      id: true,
      version: true,
      title: true,
      format: true,
      createdAt: true,
      author: { select: { name: true } }
    }
  });
  return NextResponse.json(reports, { headers: { "Cache-Control": "private, no-store" } });
}
