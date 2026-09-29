"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";

const RelationshipGraph = dynamic(() => import("./RelationshipGraph"), { ssr: false });

const EVIDENCE_TYPES = [
  "SMARTPHONE", "NOTEBOOK", "COMPUTADOR", "HD", "SSD", "PENDRIVE", "CARTAO_MEMORIA", "OUTRO_FISICO",
  "IMAGEM_FORENSE", "ARQUIVO", "BANCO_DADOS", "LOG", "EMAIL", "DOCUMENTO", "CONVERSA", "METADADOS", "OUTRO_DIGITAL"
];

type Kase = {
  id: string; code: string; name: string; description?: string | null;
  status: string; priority: string; openedAt: string; closedAt?: string | null; notes?: string | null;
  responsible: { name: string; email: string };
  people: any[]; devices: any[]; evidences: any[]; findings: any[]; tasks: any[]; events: any[]; relationships: any[];
};

const TABS = [
  { key: "overview", label: "Visão Geral" },
  { key: "people", label: "Pessoas & Dispositivos" },
  { key: "evidence", label: "Evidências & Custódia" },
  { key: "relationships", label: "Mapa de Relacionamentos" },
  { key: "timeline", label: "Timeline" },
  { key: "findings", label: "Achados" },
  { key: "tasks", label: "Tarefas" }
];

export default function CaseWorkspace({ kase, role }: { kase: Kase; role: string }) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const canEdit = role === "ADMIN" || role === "PERITO";

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
    router.refresh();
    return data;
  }

  async function patch(url: string, body: unknown) {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{kase.code}</span>
            <StatusBadge value={kase.status} />
            <StatusBadge value={kase.priority} />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">{kase.name}</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">{kase.description}</p>
        </div>
        {canEdit && (
          <select
            className="input w-auto"
            value={kase.status}
            onChange={(e) => patch(`/api/cases/${kase.id}`, { status: e.target.value }).catch((err) => alert(err.message))}
          >
            <option value="EM_ANALISE">Em análise</option>
            <option value="AGUARDANDO_EVIDENCIAS">Aguardando evidências</option>
            <option value="EM_ELABORACAO_LAUDO">Em elaboração de laudo</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="ARQUIVADO">Arquivado</option>
          </select>
        )}
      </div>

      <div className="border-b border-gray-200 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t.key ? "border-brand-700 text-brand-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab kase={kase} />}
      {tab === "people" && <PeopleDevicesTab kase={kase} canEdit={canEdit} post={post} />}
      {tab === "evidence" && <EvidenceTab kase={kase} canEdit={canEdit} post={post} />}
      {tab === "relationships" && <RelationshipsTab kase={kase} canEdit={canEdit} post={post} />}
      {tab === "timeline" && <TimelineTab kase={kase} canEdit={canEdit} post={post} />}
      {tab === "findings" && <FindingsTab kase={kase} canEdit={canEdit} post={post} />}
      {tab === "tasks" && <TasksTab kase={kase} canEdit={canEdit} post={post} patch={patch} />}
    </div>
  );
}

function OverviewTab({ kase }: { kase: Kase }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="card p-4 md:col-span-2 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Resumo do caso</h2>
        <dl className="text-sm grid grid-cols-2 gap-y-2">
          <dt className="text-gray-500">Responsável</dt><dd>{kase.responsible.name}</dd>
          <dt className="text-gray-500">Aberto em</dt><dd>{new Date(kase.openedAt).toLocaleDateString("pt-BR")}</dd>
          <dt className="text-gray-500">Encerrado em</dt><dd>{kase.closedAt ? new Date(kase.closedAt).toLocaleDateString("pt-BR") : "—"}</dd>
          <dt className="text-gray-500">Pessoas</dt><dd>{kase.people.length}</dd>
          <dt className="text-gray-500">Dispositivos</dt><dd>{kase.devices.length}</dd>
          <dt className="text-gray-500">Evidências</dt><dd>{kase.evidences.length}</dd>
          <dt className="text-gray-500">Achados</dt><dd>{kase.findings.length}</dd>
        </dl>
        {kase.notes && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Observações</div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{kase.notes}</p>
          </div>
        )}
      </div>
      <div className="card p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">Tarefas pendentes</h2>
        <ul className="text-sm space-y-1">
          {kase.tasks.filter((t) => t.status !== "CONCLUIDA").slice(0, 6).map((t) => (
            <li key={t.id} className="flex items-center gap-2">☐ {t.title}</li>
          ))}
          {kase.tasks.every((t) => t.status === "CONCLUIDA") && <li className="text-gray-400">Nenhuma tarefa pendente.</li>}
        </ul>
      </div>
    </div>
  );
}

function PeopleDevicesTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const [showPerson, setShowPerson] = useState(false);
  const [showDevice, setShowDevice] = useState(false);
  const [personForm, setPersonForm] = useState({ name: "", role: "", email: "", phone: "", document: "" });
  const [deviceForm, setDeviceForm] = useState({ type: "SMARTPHONE", personId: "", brand: "", model: "", serialNumber: "", imei: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Pessoas</h2>
          {canEdit && <button className="text-xs text-brand-700 hover:underline" onClick={() => setShowPerson((s) => !s)}>+ Adicionar</button>}
        </div>
        {showPerson && (
          <form
            className="space-y-2 mb-4 border border-gray-100 rounded-md p-3 bg-gray-50"
            onSubmit={async (e) => {
              e.preventDefault(); setError(null);
              try { await post(`/api/cases/${kase.id}/people`, personForm); setShowPerson(false); setPersonForm({ name: "", role: "", email: "", phone: "", document: "" }); }
              catch (err: any) { setError(err.message); }
            }}
          >
            <input className="input" placeholder="Nome" required value={personForm.name} onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })} />
            <input className="input" placeholder="Papel (ex.: investigado, testemunha)" value={personForm.role} onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })} />
            <input className="input" placeholder="E-mail" value={personForm.email} onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })} />
            <input className="input" placeholder="Telefone" value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: e.target.value })} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button className="btn-primary text-xs py-1.5">Salvar pessoa</button>
          </form>
        )}
        <ul className="divide-y divide-gray-100 text-sm">
          {kase.people.map((p) => (
            <li key={p.id} className="py-2">
              <div className="font-medium">{p.name} <span className="text-xs text-gray-400 font-normal">{p.code}</span></div>
              <div className="text-xs text-gray-500">{[p.role, p.email, p.phone].filter(Boolean).join(" · ")}</div>
            </li>
          ))}
          {kase.people.length === 0 && <li className="py-4 text-gray-400 text-sm">Nenhuma pessoa cadastrada.</li>}
        </ul>
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-800">Dispositivos</h2>
          {canEdit && <button className="text-xs text-brand-700 hover:underline" onClick={() => setShowDevice((s) => !s)}>+ Adicionar</button>}
        </div>
        {showDevice && (
          <form
            className="space-y-2 mb-4 border border-gray-100 rounded-md p-3 bg-gray-50"
            onSubmit={async (e) => {
              e.preventDefault(); setError(null);
              try { await post(`/api/cases/${kase.id}/devices`, deviceForm); setShowDevice(false); }
              catch (err: any) { setError(err.message); }
            }}
          >
            <select className="input" value={deviceForm.type} onChange={(e) => setDeviceForm({ ...deviceForm, type: e.target.value })}>
              {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="input" value={deviceForm.personId} onChange={(e) => setDeviceForm({ ...deviceForm, personId: e.target.value })}>
              <option value="">Sem pessoa associada</option>
              {kase.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Marca" value={deviceForm.brand} onChange={(e) => setDeviceForm({ ...deviceForm, brand: e.target.value })} />
              <input className="input" placeholder="Modelo" value={deviceForm.model} onChange={(e) => setDeviceForm({ ...deviceForm, model: e.target.value })} />
            </div>
            <input className="input" placeholder="Número de série" value={deviceForm.serialNumber} onChange={(e) => setDeviceForm({ ...deviceForm, serialNumber: e.target.value })} />
            <input className="input" placeholder="IMEI" value={deviceForm.imei} onChange={(e) => setDeviceForm({ ...deviceForm, imei: e.target.value })} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button className="btn-primary text-xs py-1.5">Salvar dispositivo</button>
          </form>
        )}
        <ul className="divide-y divide-gray-100 text-sm">
          {kase.devices.map((d) => (
            <li key={d.id} className="py-2">
              <div className="font-medium">{d.brand} {d.model} <span className="text-xs text-gray-400 font-normal">{d.code}</span></div>
              <div className="text-xs text-gray-500">{d.type} {d.person ? `· ${d.person.name}` : ""} {d.imei ? `· IMEI ${d.imei}` : ""}</div>
            </li>
          ))}
          {kase.devices.length === 0 && <li className="py-4 text-gray-400 text-sm">Nenhum dispositivo cadastrado.</li>}
        </ul>
      </div>
    </div>
  );
}

function EvidenceTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "DIGITAL", type: "IMAGEM_FORENSE", description: "", deviceId: "", collectionPlace: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && <button className="btn-primary text-xs py-1.5" onClick={() => setShowForm((s) => !s)}>+ Nova evidência</button>}
      </div>
      {showForm && (
        <form
          className="card p-4 space-y-2 max-w-xl"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            try { await post(`/api/cases/${kase.id}/evidences`, form); setShowForm(false); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="FISICA">Física</option>
              <option value="DIGITAL">Digital</option>
            </select>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <textarea className="input" placeholder="Descrição" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
            <option value="">Sem dispositivo associado</option>
            {kase.devices.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.brand} {d.model}</option>)}
          </select>
          <input className="input" placeholder="Local de coleta" value={form.collectionPlace} onChange={(e) => setForm({ ...form, collectionPlace: e.target.value })} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button className="btn-primary text-xs py-1.5">Salvar evidência</button>
        </form>
      )}

      <div className="space-y-3">
        {kase.evidences.map((ev) => (
          <div key={ev.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-gray-400">{ev.code}</span>
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{ev.category === "DIGITAL" ? "Digital" : "Física"}</span>
                <div className="font-medium text-sm mt-1">{ev.description}</div>
                <div className="text-xs text-gray-500">{ev.type} {ev.device ? `· dispositivo ${ev.device.code}` : ""}</div>
              </div>
              <button className="text-xs text-brand-700 hover:underline" onClick={() => setExpanded(expanded === ev.id ? null : ev.id)}>
                {expanded === ev.id ? "Fechar" : "Hash & custódia"}
              </button>
            </div>
            {expanded === ev.id && <EvidenceDetail evidence={ev} canEdit={canEdit} post={post} />}
          </div>
        ))}
        {kase.evidences.length === 0 && <p className="text-sm text-gray-400">Nenhuma evidência cadastrada ainda.</p>}
      </div>
    </div>
  );
}

function EvidenceDetail({ evidence, canEdit, post }: { evidence: any; canEdit: boolean; post: any }) {
  const [hashForm, setHashForm] = useState({ algorithm: "SHA256", value: "" });
  const [custodyForm, setCustodyForm] = useState({ action: "TRANSFERENCIA", fromCustodian: "", toCustodian: "", location: "", reason: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Integridade (hashes)</h3>
        <ul className="text-xs space-y-1 mb-3">
          {evidence.hashes.map((h: any) => (
            <li key={h.id} className="font-mono text-gray-600">{h.algorithm}: {h.value}</li>
          ))}
          {evidence.hashes.length === 0 && <li className="text-gray-400">Nenhum hash registrado.</li>}
        </ul>
        {canEdit && (
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault(); setError(null);
              try {
                const res = await post(`/api/evidences/${evidence.id}/hashes`, hashForm);
                if (res.divergent) alert("Atenção: valor de hash divergente de um registro anterior para este algoritmo.");
                setHashForm({ algorithm: "SHA256", value: "" });
              } catch (err: any) { setError(err.message); }
            }}
          >
            <select className="input w-24" value={hashForm.algorithm} onChange={(e) => setHashForm({ ...hashForm, algorithm: e.target.value })}>
              <option value="MD5">MD5</option>
              <option value="SHA1">SHA-1</option>
              <option value="SHA256">SHA-256</option>
            </select>
            <input className="input" placeholder="Valor do hash" required value={hashForm.value} onChange={(e) => setHashForm({ ...hashForm, value: e.target.value })} />
            <button className="btn-secondary text-xs">Registrar</button>
          </form>
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Cadeia de custódia</h3>
        <ul className="text-xs space-y-1 mb-3">
          {evidence.custodyEvents.map((c: any) => (
            <li key={c.id}>{new Date(c.occurredAt).toLocaleString("pt-BR")} — {c.action} → {c.toCustodian}</li>
          ))}
          {evidence.custodyEvents.length === 0 && <li className="text-gray-400">Nenhum evento registrado.</li>}
        </ul>
        {canEdit && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault(); setError(null);
              try { await post(`/api/evidences/${evidence.id}/custody`, custodyForm); setCustodyForm({ action: "TRANSFERENCIA", fromCustodian: "", toCustodian: "", location: "", reason: "" }); }
              catch (err: any) { setError(err.message); }
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <input className="input" placeholder="Ação (ex.: TRANSFERENCIA)" value={custodyForm.action} onChange={(e) => setCustodyForm({ ...custodyForm, action: e.target.value })} />
              <input className="input" placeholder="De (custodiante)" value={custodyForm.fromCustodian} onChange={(e) => setCustodyForm({ ...custodyForm, fromCustodian: e.target.value })} />
            </div>
            <input className="input" placeholder="Para (custodiante)" required value={custodyForm.toCustodian} onChange={(e) => setCustodyForm({ ...custodyForm, toCustodian: e.target.value })} />
            <input className="input" placeholder="Local" value={custodyForm.location} onChange={(e) => setCustodyForm({ ...custodyForm, location: e.target.value })} />
            <button className="btn-secondary text-xs">Registrar evento</button>
          </form>
        )}
      </div>
    </div>
  );
}

function RelationshipsTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const [form, setForm] = useState({ sourceType: "Person", sourceId: "", targetType: "Device", targetId: "", label: "" });
  const [error, setError] = useState<string | null>(null);

  const entityOptions: Record<string, { id: string; label: string }[]> = {
    Person: kase.people.map((p) => ({ id: p.id, label: `${p.code} — ${p.name}` })),
    Device: kase.devices.map((d) => ({ id: d.id, label: `${d.code} — ${d.brand ?? ""} ${d.model ?? ""}` })),
    Evidence: kase.evidences.map((e) => ({ id: e.id, label: `${e.code} — ${e.description}` })),
    Finding: kase.findings.map((f) => ({ id: f.id, label: `${f.code} — ${f.title}` })),
    CaseEvent: kase.events.map((ev) => ({ id: ev.id, label: `${ev.title}` }))
  };

  const graphEntities = [
    ...kase.people.map((p) => ({ id: p.id, type: "Person", label: p.name, sub: p.code })),
    ...kase.devices.map((d) => ({ id: d.id, type: "Device", label: `${d.brand ?? ""} ${d.model ?? ""}`.trim() || d.type, sub: d.code })),
    ...kase.evidences.map((e) => ({ id: e.id, type: "Evidence", label: e.description, sub: e.code })),
    ...kase.findings.map((f) => ({ id: f.id, type: "Finding", label: f.title, sub: f.code })),
    ...kase.events.map((ev) => ({ id: ev.id, type: "CaseEvent", label: ev.title }))
  ];

  return (
    <div className="space-y-4">
      <RelationshipGraph entities={graphEntities} relationships={kase.relationships} />

      {canEdit && (
        <form
          className="card p-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            if (!form.sourceId || !form.targetId) { setError("Selecione origem e destino"); return; }
            try { await post(`/api/cases/${kase.id}/relationships`, form); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <div>
            <label className="label">Origem — tipo</label>
            <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value, sourceId: "" })}>
              {Object.keys(entityOptions).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Origem — item</label>
            <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
              <option value="">Selecione</option>
              {entityOptions[form.sourceType]?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destino — tipo</label>
            <select className="input" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, targetId: "" })}>
              {Object.keys(entityOptions).map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destino — item</label>
            <select className="input" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}>
              <option value="">Selecione</option>
              {entityOptions[form.targetType]?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rótulo</label>
            <input className="input" placeholder="ex.: possui" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <button className="btn-primary text-sm">Relacionar</button>
          {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        </form>
      )}
    </div>
  );
}

function TimelineTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const [form, setForm] = useState({ title: "", description: "", category: "", occurredAt: "" });
  const [error, setError] = useState<string | null>(null);

  const custodyEvents = kase.evidences.flatMap((ev: any) =>
    ev.custodyEvents.map((c: any) => ({ occurredAt: c.occurredAt, title: `${c.action} — ${ev.code}`, category: "Custódia" }))
  );
  const allEvents = [...kase.events, ...custodyEvents].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  return (
    <div className="space-y-4">
      {canEdit && (
        <form
          className="card p-4 flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            try { await post(`/api/cases/${kase.id}/events`, form); setForm({ title: "", description: "", category: "", occurredAt: "" }); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <div>
            <label className="label">Data/hora</label>
            <input className="input" type="datetime-local" required value={form.occurredAt} onChange={(e) => setForm({ ...form, occurredAt: e.target.value })} />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="label">Título do evento</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          <button className="btn-primary text-sm">Adicionar evento</button>
          {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        </form>
      )}

      <div className="card p-4">
        <ol className="relative border-l border-gray-200 ml-2">
          {allEvents.map((ev: any, idx: number) => (
            <li key={idx} className="mb-4 ml-4">
              <div className="absolute w-2 h-2 bg-brand-600 rounded-full mt-1.5 -left-1 border border-white" />
              <time className="text-xs text-gray-400">{new Date(ev.occurredAt).toLocaleString("pt-BR")}</time>
              <p className="text-sm font-medium text-gray-800">{ev.title}</p>
              {ev.category && <span className="text-xs text-gray-500">{ev.category}</span>}
            </li>
          ))}
          {allEvents.length === 0 && <p className="text-sm text-gray-400">Nenhum evento na linha do tempo ainda.</p>}
        </ol>
      </div>
    </div>
  );
}

function FindingsTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "", evidenceId: "" });
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canEdit && <button className="btn-primary text-xs py-1.5" onClick={() => setShowForm((s) => !s)}>+ Novo achado</button>}
      </div>
      {showForm && (
        <form
          className="card p-4 space-y-2 max-w-xl"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            try { await post(`/api/cases/${kase.id}/findings`, form); setShowForm(false); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <input className="input" placeholder="Título" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="input" placeholder="Descrição" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <select className="input" value={form.evidenceId} onChange={(e) => setForm({ ...form, evidenceId: e.target.value })}>
            <option value="">Sem evidência associada</option>
            {kase.evidences.map((ev) => <option key={ev.id} value={ev.id}>{ev.code} — {ev.description}</option>)}
          </select>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button className="btn-primary text-xs py-1.5">Salvar achado</button>
        </form>
      )}
      <div className="space-y-2">
        {kase.findings.map((f) => (
          <div key={f.id} className="card p-4">
            <div className="text-xs font-mono text-gray-400">{f.code}</div>
            <div className="font-medium text-sm">{f.title}</div>
            <p className="text-sm text-gray-600 mt-1">{f.description}</p>
          </div>
        ))}
        {kase.findings.length === 0 && <p className="text-sm text-gray-400">Nenhum achado registrado ainda.</p>}
      </div>
    </div>
  );
}

function TasksTab({ kase, canEdit, post, patch }: { kase: Kase; canEdit: boolean; post: any; patch: any }) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4 max-w-2xl">
      {canEdit && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            try { await post(`/api/cases/${kase.id}/tasks`, { title }); setTitle(""); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <input className="input" placeholder="Nova tarefa" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="btn-primary text-sm">Adicionar</button>
        </form>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <ul className="card divide-y divide-gray-100">
        {kase.tasks.map((t) => (
          <li key={t.id} className="p-3 flex items-center justify-between text-sm">
            <span className={t.status === "CONCLUIDA" ? "line-through text-gray-400" : ""}>{t.title}</span>
            {canEdit ? (
              <select
                className="input w-auto text-xs py-1"
                value={t.status}
                onChange={(e) => patch(`/api/tasks/${t.id}`, { status: e.target.value })}
              >
                <option value="PENDENTE">Pendente</option>
                <option value="EM_ANDAMENTO">Em andamento</option>
                <option value="CONCLUIDA">Concluída</option>
              </select>
            ) : (
              <span className="text-xs text-gray-500">{t.status}</span>
            )}
          </li>
        ))}
        {kase.tasks.length === 0 && <li className="p-4 text-sm text-gray-400">Nenhuma tarefa cadastrada.</li>}
      </ul>
    </div>
  );
}
