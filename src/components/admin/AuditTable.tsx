"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { normalize } from "@/lib/text";

type Log = { id: string; createdAt: string; user: string; action: string; entityType: string; entityId: string | null; details: string | null };

export default function AuditTable({ logs }: { logs: Log[] }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const list = useMemo(() => {
    const n = normalize(q);
    return logs.filter((l) => (!action || l.action === action) && (!n || normalize(`${l.user} ${l.action} ${l.entityType} ${l.details ?? ""}`).includes(n)));
  }, [logs, q, action]);

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[220px] flex-1"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
          <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por usuário, ação, detalhe…" aria-label="Buscar nos logs" /></div>
        <select className="input !w-auto" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Ação"><option value="">Todas as ações</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        <span className="text-xs text-gray-500" aria-live="polite">{list.length} de {logs.length}</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="table-base min-w-[760px]"><thead><tr><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>Detalhes</th></tr></thead>
          <tbody>{list.map((l) => (
            <tr key={l.id}><td className="whitespace-nowrap text-xs text-gray-500">{new Date(l.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td><td>{l.user}</td>
              <td><span className="tag-code">{l.action}</span></td><td>{l.entityType}{l.entityId ? <span className="text-gray-500"> · {l.entityId.slice(0, 8)}</span> : ""}</td><td className="text-gray-500">{l.details ?? "—"}</td></tr>
          ))}{list.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500">Nenhum registro.</td></tr>}</tbody></table>
      </div>
    </div>
  );
}
