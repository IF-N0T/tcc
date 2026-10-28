import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isOnline } from "@/lib/presence";
import PageHeader from "@/components/ui/PageHeader";
import AccountsPanel from "@/components/admin/AccountsPanel";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, lastLoginAt: true, lastSeenAt: true, leftAt: true }
  });
  const now = Date.now();
  const initial = users.map(({ leftAt, ...u }) => ({
    ...u, createdAt: u.createdAt.toISOString(), lastLoginAt: u.lastLoginAt?.toISOString() ?? null, lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    online: u.active && isOnline({ lastSeenAt: u.lastSeenAt, leftAt }, now)
  }));

  return (
    <div>
      <PageHeader eyebrow="Administração" title="Contas e acesso" description="Veja quem está online, gerencie perfis e permissões e ative ou desative contas." />
      <AccountsPanel initial={initial} selfId={session.sub} />
    </div>
  );
}
