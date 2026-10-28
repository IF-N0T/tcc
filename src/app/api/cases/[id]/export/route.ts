import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { loadCaseData } from "@/lib/case-data";
import { detectGaps } from "@/lib/watson/gaps";
import { buildExport, EXPORT_FORMATS, type ExportFormat } from "@/lib/export";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") ?? "html") as ExportFormat;
  if (!EXPORT_FORMATS.includes(format)) return NextResponse.json({ error: "Formato inválido." }, { status: 400 });
  const doc = sp.get("doc") === "laudo" ? "laudo" : "full";
  const mode = sp.get("mode") === "bw" ? "bw" : "color";

  const data = await loadCaseData(params.id);
  if (!data) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  const result = buildExport(data, detectGaps(data), {
    format, doc, mode, section: sp.get("section") ?? undefined, generatedBy: session.name, autoPrint: sp.get("print") === "1"
  });

  await logAudit({
    userId: session.sub, action: "EXPORTACAO_RELATORIO", entityType: "Case", entityId: data.id,
    details: `${data.code} · ${format}${format === "html" ? ` · ${mode}` : ""} · ${doc}`
  });

  const inline = format === "html" && sp.get("inline") === "1";
  const body = typeof result.body === "string" ? result.body : new Uint8Array(result.body);
  return new NextResponse(body, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${result.filename}"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
      "Cache-Control": "private, no-store"
    }
  });
}
