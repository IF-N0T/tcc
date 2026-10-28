"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Search, ShieldCheck, ShieldOff, Wifi } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useConfirm, useToast } from "@/components/ui/Providers";
import { ROLE_LABEL } from "@/lib/labels";
import { normalize } from "@/lib/text";

export type Account = { id: string; name: string; email: string; role: string; active: boolean; createdAt: string; lastLoginAt: string | null; lastSeenAt: string | null; online: boolean };

const PERMS: [string, boolean, boolean, boolean][] = [
  ["Ver casos, evidências, laudos e a Biblioteca", true, true, true],
  ["Exportar relatórios e usar o Watson", true, true, true],
  ["Criar/editar casos, evidências, hashes e custódia", true, true, false],
  ["Importar arquivos de ferramentas e registrar notas", true, true, false],
  ["Cadastrar itens na Biblioteca", true, true, false],
  ["Excluir casos (com backup automático)", true, true, false],
  ["Ver contas, presença e auditoria", true, false, false],
  ["Alterar perfis, ativar/desativar contas, redefinir senha", true, false, false],
  ["Backup e restauração do sistema", true, false, false]
];

function ago(iso: string | null) {
  if (!iso) return "nunca";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora há pouco"; const m = Math.round(s / 60); if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `há ${h} h`; return new Date(iso).toLocaleDateString("pt-BR");
}

export default function AccountsPanel({ initial, selfId }: { initial: Account[]; selfId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState(initial);
  const [filter, setFilter] = useState<"all" | "online" | "offline">("all");
  const [q, setQ] = useState("");
  const [live, setLive] = useState(true);
  const [updated, setUpdated] = useState<Date>(new Date());

  const refresh = useCallback(async () => {
    try { const res = await fetch("/api/admin/presence", { cache: "no-store" }); if (res.ok) { setUsers((await res.json()).users); setUpdated(new Date()); } } catch {}
  }, []);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 15000);
    return () => clearInterval(t);
  }, [live, refresh]);

  const online = users.filter((u) => u.online).length;
  const list = useMemo(() => users.filter((u) => (filter === "all" || (filter === "online") === u.online) && (!q || normalize(`${u.name} ${u.email}`).includes(normalize(q)))).sort((a, b) => Number(b.online) - Number(a.online) || a.name.localeCompare(b.name, "pt-BR")), [users, filter, q]);

  async function patch(u: Account, body: Record<string, unknown>, okMsg: string) {
    const res = await fetch(`/api/admin/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error ?? "Não foi possível alterar.", "error"); return; }
    toast(okMsg, "ok"); refresh();
  }
  async function toggleActive(u: Account) {
    const ok = await confirm({ title: u.active ? `Desativar ${u.name}?` : `Reativar ${u.name}?`, message: u.active ? "A conta não conseguirá entrar e a sessão aberta será encerrada em até um minuto." : undefined, confirmLabel: u.active ? "Desativar" : "Reativar", danger: u.active });
    if (ok) patch(u, { active: !u.active }, u.active ? "Conta desativada." : "Conta reativada.");
  }
  async function resetPassword(u: Account) {
    const pwd = window.prompt(`Nova senha para ${u.name} (mínimo 12 caracteres):`);
    if (!pwd) return;
    if (pwd.length < 12) { toast("A senha precisa ter ao menos 12 caracteres.", "warn"); return; }
    patch(u, { password: pwd }, "Senha redefinida. Informe-a ao usuário por canal seguro.");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500"><span className="dot dot-online" aria-hidden="true" /> Online agora</div><div className="font-display mt-2 text-4xl font-semibold text-green-600">{online}</div></div>
        <div className="card p-5"><div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500"><span className="dot" aria-hidden="true" /> Offline</div><div className="font-display mt-2 text-4xl font-semibold text-gray-900">{users.length - online}</div></div>
        <div className="card p-5"><div className="text-xs font-medium uppercase tracking-wide text-gray-500">Contas</div><div className="font-display mt-2 text-4xl font-semibold text-gray-900">{users.length}</div><div className="text-xs text-gray-500">{users.filter((u) => !u.active).length} desativada(s)</div></div>
      </div>

      <section className="card overflow-hidden" aria-labelledby="acc">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <h2 id="acc" className="mr-auto text-sm font-semibold text-gray-900">Contas e presença</h2>
          <div className="relative"><Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" /><input className="input !w-56 !pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conta…" aria-label="Buscar conta" /></div>
          <div className="seg" role="group" aria-label="Filtrar por presença">{([["all", "Todas"], ["online", "Online"], ["offline", "Offline"]] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>)}</div>
          <button type="button" onClick={() => setLive((l) => !l)} aria-pressed={live} className={`badge cursor-pointer ${live ? "badge-green" : "badge-neutral"}`}><Wifi size={12} aria-hidden="true" /> {live ? "Ao vivo" : "Pausado"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead><tr><th>Conta</th><th>Presença</th><th>Perfil</th><th>Último acesso</th><th>Último sinal</th><th className="text-right">Ações</th></tr></thead>
            <tbody>
              {list.map((u) => {
                const self = u.id === selfId;
                return (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <td><div className="flex items-center gap-3"><Avatar name={u.name} size={34} online={u.online} /><div><div className="font-medium text-gray-900">{u.name}{self && <span className="badge badge-blue ml-2">você</span>}</div><div className="text-xs text-gray-500">{u.email}</div></div></div></td>
                    <td>{!u.active ? <span className="badge badge-red">Desativada</span> : u.online ? <span className="badge badge-green"><span className="dot dot-online" aria-hidden="true" /> Online</span> : <span className="badge badge-neutral">Offline</span>}</td>
                    <td><select className="input !w-auto !py-1 text-xs" value={u.role} disabled={self} aria-label={`Perfil de ${u.name}`} onChange={(e) => patch(u, { role: e.target.value }, "Perfil atualizado.")}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></td>
                    <td className="whitespace-nowrap text-gray-500">{ago(u.lastLoginAt)}</td>
                    <td className="whitespace-nowrap text-gray-500">{u.online ? "agora" : ago(u.lastSeenAt)}</td>
                    <td className="text-right"><div className="flex justify-end gap-1">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => resetPassword(u)} title="Redefinir senha"><KeyRound size={14} aria-hidden="true" /><span className="sr-only">Redefinir senha</span></button>
                      <button type="button" className="btn-ghost btn-sm" disabled={self} onClick={() => toggleActive(u)} title={u.active ? "Desativar conta" : "Reativar conta"}>{u.active ? <ShieldOff size={14} aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}<span className="sr-only">{u.active ? "Desativar" : "Reativar"}</span></button></div></td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-500">Nenhuma conta encontrada.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">Considera-se online quem enviou sinal nos últimos ~2,5 min com a aba visível. Atualizado às {updated.toLocaleTimeString("pt-BR")}.</p>
      </section>

      <section className="card overflow-x-auto" aria-labelledby="perms">
        <div className="border-b border-gray-100 px-5 py-3"><h2 id="perms" className="text-sm font-semibold text-gray-900">Permissões por perfil</h2></div>
        <table className="table-base min-w-[560px]"><thead><tr><th>Ação</th>{Object.values(ROLE_LABEL).map((r) => <th key={r} className="text-center">{r}</th>)}</tr></thead>
          <tbody>{PERMS.map(([label, ...vals]) => <tr key={label}><td>{label}</td>{vals.map((v, i) => <td key={i} className="text-center">{v ? <span className="text-green-500" aria-label="permitido">●</span> : <span className="text-gray-400" aria-label="não permitido">—</span>}</td>)}</tr>)}</tbody></table>
      </section>
    </div>
  );
}
