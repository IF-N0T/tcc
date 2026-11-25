import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: { id: string; attachmentId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const attachment = await prisma.reportAttachment.findFirst({
    where: { id: params.attachmentId, caseId: params.id },
    select: { id: true, filename: true, mimeType: true, fileSize: true, fileData: true, sha256: true, case: { select: { code: true } } }
  });
  if (!attachment) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

  await logAudit({
    userId: session.sub,
    action: "DOWNLOAD_ANEXO_RELATORIO",
    entityType: "ReportAttachment",
    entityId: attachment.id,
    details: `${attachment.case.code} · ${attachment.filename} · SHA-256 ${attachment.sha256}`
  });

  const fallbackFilename = attachment.filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return new NextResponse(new Uint8Array(attachment.fileData), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(attachment.fileSize),
      "Content-Disposition": `attachment; filename="${fallbackFilename}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store"
    }
  });
}
