import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { getSession, requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  role: z.enum(["ADMIN", "PERITO", "VISUALIZADOR"]).optional(),
  active: z.boolean().optional(),
  password: z.string().min(12, "A senha precisa ter ao menos 12 caracteres.").max(128).optional()
}).refine((v) => v.role !== undefined || v.active !== undefined || v.password !== undefined, { message: "Nada para alterar." });

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try { requireRole(session, ["ADMIN"]); } catch (r) { return r as Response; }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const self = target.id === session.sub;
  if (self && (parsed.data.role !== undefined || parsed.data.active !== undefined)) {
    return NextResponse.json({ error: "Você não pode alterar o próprio perfil ou desativar a própria conta." }, { status: 409 });
  }
  const losesAdmin = target.role === "ADMIN" && ((parsed.data.role && parsed.data.role !== "ADMIN") || parsed.data.active === false);
  if (losesAdmin) {
    const others = await prisma.user.count({ where: { role: "ADMIN", active: true, NOT: { id: target.id } } });
    if (others === 0) return NextResponse.json({ error: "É preciso manter ao menos um administrador ativo." }, { status: 409 });
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.active !== undefined) { data.active = parsed.data.active; if (!parsed.data.active) data.leftAt = new Date(); }
  if (parsed.data.password !== undefined) data.passwordHash = await hashPassword(parsed.data.password);

  const updated = await prisma.user.update({ where: { id: target.id }, data, select: { id: true, name: true, email: true, role: true, active: true } });
  const actions: string[] = [];
  if (parsed.data.role !== undefined) actions.push(`perfil ${target.role}→${parsed.data.role}`);
  if (parsed.data.active !== undefined) actions.push(parsed.data.active ? "conta ativada" : "conta desativada");
  if (parsed.data.password !== undefined) actions.push("senha redefinida");
  await logAudit({ userId: session.sub, action: "ALTERACAO_USUARIO", entityType: "User", entityId: target.id, details: `${target.email}: ${actions.join(", ")}` });
  return NextResponse.json(updated);
}
