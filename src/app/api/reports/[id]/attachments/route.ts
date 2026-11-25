import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const caseRecord = await prisma.case.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!caseRecord) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  const attachments = await prisma.reportAttachment.findMany({
    where: { caseId: caseRecord.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      fileSize: true,
      sha256: true,
      description: true,
      createdAt: true,
      uploadedBy: { select: { name: true } }
    }
  });
  return NextResponse.json(attachments, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    requireRole(session, ["ADMIN", "PERITO"]);
  } catch (response) {
    return response as Response;
  }

  const caseRecord = await prisma.case.findUnique({ where: { id: params.id }, select: { id: true, code: true } });
  if (!caseRecord) return NextResponse.json({ error: "Caso não encontrado." }, { status: 404 });

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_FILE_SIZE + 64 * 1024) {
    return NextResponse.json({ error: "O arquivo excede o limite de 10 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Envie um formulário válido com o arquivo." }, { status: 400 });
  }
  const uploaded = form.get("file");
  if (!uploaded || typeof uploaded === "string") return NextResponse.json({ error: "Selecione um arquivo." }, { status: 400 });
  if (uploaded.size === 0) return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  if (uploaded.size > MAX_FILE_SIZE) return NextResponse.json({ error: "O arquivo excede o limite de 10 MB." }, { status: 413 });

  let bytes: Buffer;
  try {
    bytes = Buffer.from(await uploaded.arrayBuffer());
  } catch (error) {
    console.error("Não foi possível ler o anexo do relatório.", error);
    return NextResponse.json({ error: "Não foi possível ler o arquivo enviado." }, { status: 500 });
  }
  if (bytes.length === 0) return NextResponse.json({ error: "O arquivo está vazio." }, { status: 400 });
  if (bytes.length > MAX_FILE_SIZE) return NextResponse.json({ error: "O arquivo excede o limite de 10 MB." }, { status: 413 });

  let mimeType: string;
  if (bytes.subarray(0, 5).toString("ascii") === "%PDF-") mimeType = "application/pdf";
  else if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) mimeType = "image/png";
  else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mimeType = "image/jpeg";
  else return NextResponse.json({ error: "Formato não permitido. Envie PDF, PNG ou JPEG válido." }, { status: 415 });

  const descriptionValue = form.get("description");
  if (descriptionValue !== null && typeof descriptionValue !== "string") return NextResponse.json({ error: "Descrição inválida." }, { status: 400 });
  const description = typeof descriptionValue === "string" ? descriptionValue.trim().slice(0, 2000) || null : null;
  const filename = uploaded.name
    .replace(/[\\/]/g, "/")
    .split("/")
    .pop()
    ?.replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255) || "arquivo";
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const attachment = await prisma.reportAttachment.create({
    data: {
      caseId: caseRecord.id,
      uploadedById: session.sub,
      filename,
      mimeType,
      fileSize: bytes.length,
      sha256,
      description,
      fileData: bytes
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      fileSize: true,
      sha256: true,
      description: true,
      createdAt: true,
      uploadedBy: { select: { name: true } }
    }
  });

  await logAudit({
    userId: session.sub,
    action: "ANEXO_RELATORIO",
    entityType: "ReportAttachment",
    entityId: attachment.id,
    details: `${caseRecord.code} · ${filename} · SHA-256 ${sha256}`
  });
  return NextResponse.json(attachment, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
