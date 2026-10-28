import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/session";
import { runWatson } from "@/lib/watson/engine";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().trim().min(2, "Escreva uma pergunta com ao menos 2 caracteres.").max(400),
  caseId: z.string().optional().nullable()
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Pergunta inválida." }, { status: 400 });
  try {
    return NextResponse.json(await runWatson(parsed.data.message, parsed.data.caseId));
  } catch (error) {
    console.error("Watson error:", error);
    return NextResponse.json({ error: "O Watson não conseguiu concluir a consulta. Tente novamente." }, { status: 500 });
  }
}
