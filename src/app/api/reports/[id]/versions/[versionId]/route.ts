import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET(_request: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const report = await prisma.caseReport.findFirst({
    where: { id: params.versionId, caseId: params.id },
    include: { case: { select: { code: true } } }
  });
  if (!report) return NextResponse.json({ error: "Versão do relatório não encontrada." }, { status: 404 });

  return new NextResponse(report.content, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.case.code}-v${report.version}.json"`,
      "Cache-Control": "private, no-store"
    }
  });
}
