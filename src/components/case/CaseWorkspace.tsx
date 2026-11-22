"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import { useToast } from "@/components/ui/Providers";
import { hashFileInBrowser, type EvidenceHashAlgorithm } from "@/lib/browser-hash";
import type { Gap } from "@/lib/watson/types";
import ExportMenu from "./ExportMenu";
import NotesTab from "./NotesTab";
import AnalysesTab from "./AnalysesTab";
import WatsonPanel from "@/components/watson/WatsonPanel";
import WatsonMark from "@/components/watson/WatsonMark";

const RelationshipGraph = dynamic(() => import("./RelationshipGraph"), { ssr: false });

const EVIDENCE_TYPES = [
  "SMARTPHONE", "NOTEBOOK", "COMPUTADOR", "HD", "SSD", "PENDRIVE", "CARTAO_MEMORIA", "OUTRO_FISICO",
  "IMAGEM_FORENSE", "ARQUIVO", "BANCO_DADOS", "LOG", "EMAIL", "DOCUMENTO", "CONVERSA", "METADADOS", "OUTRO_DIGITAL"
];
const RELATIONSHIP_TYPE_LABEL: Record<string, string> = {
  Person: "Pessoa",
  Device: "Dispositivo",
  Evidence: "Evidência",
  Finding: "Achado",
  CaseEvent: "Evento"
};

type Kase = {
  id: string; code: string; name: string; description?: string | null;
  status: string; priority: string; openedAt: string; closedAt?: string | null; notes?: string | null;
  responsible: { name: string; email: string };
  people: any[]; devices: any[]; evidences: any[]; findings: any[]; tasks: any[]; events: any[]; relationships: any[];
  relationshipNodePositions: { entityType: string; entityId: string; x: number; y: number }[];
  analyses: any[]; caseNotes: any[]; toolImports: any[];
};

const TABS = [
  { key: "overview", label: "Visão Geral" },
  { key: "people", label: "Pessoas & Dispositivos" },
  { key: "evidence", label: "Evidências & Custódia" },
  { key: "analyses", label: "Análises & Importações" },
  { key: "relationships", label: "Mapa de Relacionamentos" },
  { key: "timeline", label: "Timeline" },
  { key: "findings", label: "Achados" },
  { key: "tasks", label: "Tarefas" },
  { key: "notes", label: "Diário do perito" },
  { key: "watson", label: "Watson" }
];

export default function CaseWorkspace({ kase, role, actorName, initialTab, gapsByEvidence }: { kase: Kase; role: string; actorName: string; initialTab: string; gapsByEvidence: Record<string, Gap[]> }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState(TABS.some((t) => t.key === initialTab) ? initialTab : "overview");
  const historyWarningShown = useRef(false);
  const canEdit = role === "ADMIN" || role === "PERITO";

  const recordVisit = useCallback((tabKey: string) => {
    void fetch("/api/me/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId: kase.id, tab: tabKey })
    }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
    }).catch((error: unknown) => {
      console.error("Não foi possível registrar o histórico do caso:", error);
      if (!historyWarningShown.current) {
        historyWarningShown.current = true;
        toast("Não foi possível atualizar seu histórico deste caso.", "error");
      }
    });
  }, [kase.id, toast]);

  // A seção ativa fica na URL e no histórico pessoal para facilitar a retomada.
  useEffect(() => {
    historyWarningShown.current = false;
    const savedTab = TABS.some((t) => t.key === initialTab) ? initialTab : "overview";
    const hashTab = window.location.hash.slice(1);
    const firstTab = TABS.some((t) => t.key === hashTab) ? hashTab : savedTab;
    setTab(firstTab);
    recordVisit(firstTab);
    const fromHash = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.key === h)) {
        setTab(h);
        recordVisit(h);
      }
    };
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [initialTab, recordVisit]);
  function openTab(key: string) { setTab(key); history.replaceState(null, "", `#${key}`); recordVisit(key); }

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

  const tasksDone = kase.tasks.filter((t) => t.status === "CONCLUIDA").length;
  const pct = kase.tasks.length ? Math.round((tasksDone / kase.tasks.length) * 100) : 0;
  const stats: [string, string | number][] = [
    ["Pessoas", kase.people.length], ["Dispositivos", kase.devices.length], ["Evidências", kase.evidences.length],
    ["Análises", kase.analyses.length], ["Achados", kase.findings.length], ["Tarefas", `${tasksDone}/${kase.tasks.length}`]
  ];
  const counts: Record<string, number> = { people: kase.people.length + kase.devices.length, evidence: kase.evidences.length, analyses: kase.analyses.length + kase.toolImports.length, findings: kase.findings.length, tasks: kase.tasks.length, notes: kase.caseNotes.length };

  return (
    <div className="space-y-5">
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="tag-code">{kase.code}</span><StatusBadge value={kase.status} /><StatusBadge value={kase.priority} /></div>
            <h1 className="font-display mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">{kase.name}</h1>
            {kase.description && <p className="mt-1 max-w-3xl text-sm text-gray-500">{kase.description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-secondary" onClick={() => openTab("watson")}><WatsonMark size={16} /> Perguntar ao Watson</button>
            <ExportMenu caseId={kase.id} />
            {canEdit && (
              <select className="input !w-auto" aria-label="Situação do caso" value={kase.status}
                onChange={(e) => patch(`/api/cases/${kase.id}`, { status: e.target.value }).then(() => toast("Situação atualizada.", "ok")).catch((err) => toast(err.message, "error"))}>
                <option value="EM_ANALISE">Em análise</option><option value="AGUARDANDO_EVIDENCIAS">Aguardando evidências</option>
                <option value="EM_ELABORACAO_LAUDO">Em elaboração de laudo</option><option value="CONCLUIDO">Concluído</option><option value="ARQUIVADO">Arquivado</option>
              </select>
            )}
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {stats.map(([k, v]) => <div key={k} className="rounded-lg bg-gray-100 px-3 py-2"><dd className="text-lg font-semibold text-gray-900">{v}</dd><dt className="text-[11px] text-gray-500">{k}</dt></div>)}
        </dl>
        {kase.tasks.length > 0 && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tarefas concluídas"><div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} /></div>}
      </header>

      <div className="tabs" role="tablist" aria-label="Seções do caso">
        {TABS.map((t) => (
          <button key={t.key} role="tab" id={`tab-${t.key}`} aria-selected={tab === t.key} aria-controls={`panel-${t.key}`} onClick={() => openTab(t.key)} className="tab">
            {t.key === "watson" && <WatsonMark size={13} className="mr-1.5 inline -mt-0.5" />}{t.label}
            {counts[t.key] ? <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 text-[10px] font-semibold text-gray-600">{counts[t.key]}</span> : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="rise" key={tab}>
        {tab === "overview" && <OverviewTab kase={kase} />}
        {tab === "people" && <PeopleDevicesTab kase={kase} canEdit={canEdit} post={post} />}
        {tab === "evidence" && <EvidenceTab kase={kase} canEdit={canEdit} post={post} actorName={actorName} gapsByEvidence={gapsByEvidence} />}
        {tab === "analyses" && <AnalysesTab kase={kase} canEdit={canEdit} />}
        {tab === "relationships" && <RelationshipsTab kase={kase} canEdit={canEdit} post={post} />}
        {tab === "timeline" && <TimelineTab kase={kase} canEdit={canEdit} post={post} />}
        {tab === "findings" && <FindingsTab kase={kase} canEdit={canEdit} post={post} />}
        {tab === "tasks" && <TasksTab kase={kase} canEdit={canEdit} post={post} patch={patch} />}
        {tab === "notes" && <NotesTab kase={kase} canEdit={canEdit} post={post} />}
        {tab === "watson" && <WatsonPanel cases={[{ id: kase.id, code: kase.code, name: kase.name }]} fixedCaseId={kase.id} canEdit={canEdit} compact />}
      </div>
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

function maskBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 3) return digits ? `(${digits}` : "";
  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  const splitAt = number.length > 8 ? 5 : 4;
  const prefix = number.slice(0, splitAt);
  const suffix = number.slice(splitAt);
  return `(${areaCode}) ${prefix}${suffix ? `-${suffix}` : ""}`;
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
            <input className="input" type="tel" inputMode="tel" maxLength={15} placeholder="Telefone (00) 00000-0000" value={personForm.phone} onChange={(e) => setPersonForm({ ...personForm, phone: maskBrazilianPhone(e.target.value) })} />
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
            <input className="input" inputMode="numeric" maxLength={15} pattern="[0-9]{15}" title="O IMEI deve conter 15 dígitos." placeholder="IMEI (15 dígitos)" value={deviceForm.imei} onChange={(e) => setDeviceForm({ ...deviceForm, imei: e.target.value.replace(/\D/g, "").slice(0, 15) })} />
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

function EvidenceTab({ kase, canEdit, post, actorName, gapsByEvidence }: { kase: Kase; canEdit: boolean; post: any; actorName: string; gapsByEvidence: Record<string, Gap[]> }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "DIGITAL", type: "IMAGEM_FORENSE", description: "", deviceId: "", collectionPlace: "" });
  const [error, setError] = useState<string | null>(null);

  function addressGap(evidenceId: string, gap: Gap) {
    if (gap.code === "GAP_EVIDENCIA_SEM_ANALISE") {
      const query = new URLSearchParams({ caseId: kase.id, evidenceId });
      router.push(`/analyses?${query.toString()}#analysis-form`);
      return;
    }

    setExpanded(evidenceId);
    const targetId = gap.code.startsWith("GAP_HASH_") ? `hash-register-${evidenceId}` : `custody-action-${evidenceId}`;
    window.setTimeout(() => document.getElementById(targetId)?.focus(), 0);
  }

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
            {(gapsByEvidence[ev.id] ?? []).length > 0 && (
              <ul className="mt-3 space-y-2" aria-label={`Lacunas detectadas em ${ev.code}`}>
                {(gapsByEvidence[ev.id] ?? []).map((gap) => {
                  const target = gap.code === "GAP_EVIDENCIA_SEM_ANALISE"
                    ? "Registrar análise"
                    : gap.code.startsWith("GAP_HASH_")
                      ? "Verificar ou registrar hash"
                      : "Registrar movimentação";
                  return (
                    <li key={gap.id} className="notice notice-warn flex flex-wrap items-center justify-between gap-2">
                      <span><strong>Atenção:</strong> {gap.title}</span>
                      {canEdit && <button type="button" className="btn-secondary btn-sm shrink-0" onClick={() => addressGap(ev.id, gap)}>{target}</button>}
                    </li>
                  );
                })}
              </ul>
            )}
            {expanded === ev.id && <EvidenceDetail evidence={ev} caseCode={kase.code} actorName={actorName} canEdit={canEdit} post={post} />}
          </div>
        ))}
        {kase.evidences.length === 0 && <p className="text-sm text-gray-400">Nenhuma evidência cadastrada ainda.</p>}
      </div>
    </div>
  );
}

const HASH_LENGTHS: Record<EvidenceHashAlgorithm, number> = { MD5: 32, SHA1: 40, SHA256: 64 };
const CUSTODY_ACTIONS = [
  ["COLETA", "Coleta"],
  ["TRANSFERENCIA", "Transferência"],
  ["RECEBIMENTO", "Recebimento"],
  ["DEVOLUCAO", "Devolução"],
  ["ARMAZENAMENTO", "Armazenamento"],
  ["PROCESSAMENTO", "Processamento"],
  ["OUTRO", "Outro"]
] as const;

function isValidHash(value: string, algorithm: EvidenceHashAlgorithm) {
  return value.length === HASH_LENGTHS[algorithm] && /^[a-fA-F0-9]+$/.test(value);
}

function EvidenceDetail({ evidence, caseCode, actorName, canEdit, post }: { evidence: any; caseCode: string; actorName: string; canEdit: boolean; post: any }) {
  const toast = useToast();
  const [hashForm, setHashForm] = useState({ algorithm: "SHA256", value: "" });
  const [custodyForm, setCustodyForm] = useState({ action: "TRANSFERENCIA", reason: "" });
  const [hashError, setHashError] = useState<string | null>(null);
  const [custodyError, setCustodyError] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySaving, setVerifySaving] = useState(false);
  const [verification, setVerification] = useState<{ algorithm: EvidenceHashAlgorithm; value: string; source: string; progress: number; calculating: boolean }>({
    algorithm: "SHA256", value: "", source: "", progress: 0, calculating: false
  });
  const hashRegisterRef = useRef<HTMLInputElement>(null);

  const reference = evidence.hashes
    .filter((item: any) => item.algorithm === verification.algorithm)
    .sort((a: any, b: any) => new Date(b.calculatedAt).getTime() - new Date(a.calculatedAt).getTime())[0];
  const candidate = verification.value.trim();
  const validCandidate = isValidHash(candidate, verification.algorithm);
  const validReference = reference ? isValidHash(reference.value.trim(), verification.algorithm) : false;
  const matches = validCandidate && validReference ? candidate.toLowerCase() === reference.value.trim().toLowerCase() : null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Integridade (hashes)</h3>
        <ul className="text-xs space-y-1 mb-3">
          {evidence.hashes.map((h: any) => (
            <li key={h.id} className="font-mono text-gray-600">{h.algorithm}: {h.value} · {new Date(h.calculatedAt).toLocaleString("pt-BR")}</li>
          ))}
          {evidence.hashes.length === 0 && <li className="text-gray-400">Nenhum hash registrado.</li>}
        </ul>
        {canEdit && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault(); setHashError(null);
              try {
                const res = await post(`/api/evidences/${evidence.id}/hashes`, hashForm);
                if (res.divergent) toast("Atenção: valor de hash divergente de um registro anterior para este algoritmo.", "warn");
                setHashForm({ algorithm: "SHA256", value: "" });
              } catch (err: any) { setHashError(err.message); }
            }}
          >
            <div className="flex gap-2">
              <label className="sr-only" htmlFor={`hash-algorithm-${evidence.id}`}>Algoritmo do hash a registrar</label>
              <select id={`hash-algorithm-${evidence.id}`} className="input w-28" value={hashForm.algorithm} onChange={(e) => setHashForm({ ...hashForm, algorithm: e.target.value })}>
                <option value="MD5">MD5</option><option value="SHA1">SHA-1</option><option value="SHA256">SHA-256</option>
              </select>
              <label className="sr-only" htmlFor={`hash-register-${evidence.id}`}>Valor do hash a registrar</label>
              <input ref={hashRegisterRef} id={`hash-register-${evidence.id}`} className="input min-w-0" placeholder="Cole o hash de referência" required maxLength={HASH_LENGTHS[hashForm.algorithm as EvidenceHashAlgorithm]} value={hashForm.value} onChange={(e) => setHashForm({ ...hashForm, value: e.target.value })} />
              <button type="submit" className="btn-secondary shrink-0 text-xs">Registrar</button>
            </div>
          </form>
        )}
        {hashError && <p role="alert" className="mt-1 text-xs text-crit">{hashError}</p>}

        {canEdit && (
          <section className="mt-4 space-y-2 rounded-lg border border-gray-200 p-3" aria-labelledby={`hash-verify-title-${evidence.id}`}>
            <h4 id={`hash-verify-title-${evidence.id}`} className="text-xs font-semibold text-gray-800">Verificar hash</h4>
            <p className="text-xs text-gray-500">Compare com o hash de referência mais recente. Arquivos são processados localmente no navegador e não são enviados.</p>
            <p className="text-xs text-gray-500">Para novos registros, prefira SHA-256; MD5 e SHA-1 ficam disponíveis por compatibilidade.</p>
            <label className="label" htmlFor={`hash-verify-algorithm-${evidence.id}`}>Algoritmo</label>
            <select
              id={`hash-verify-algorithm-${evidence.id}`}
              className="input"
              disabled={verification.calculating}
              value={verification.algorithm}
              onChange={(event) => setVerification({ algorithm: event.target.value as EvidenceHashAlgorithm, value: "", source: "", progress: 0, calculating: false })}
            >
              <option value="MD5">MD5</option><option value="SHA1">SHA-1</option><option value="SHA256">SHA-256</option>
            </select>
            {reference
              ? <p className="break-all text-xs text-gray-500">Referência mais recente: <code className="font-mono">{reference.value}</code></p>
              : <p className="notice notice-warn text-xs">Não há hash {verification.algorithm} registrado para usar como referência.</p>}
            {reference && !validReference && <p className="notice notice-warn text-xs">O hash de referência registrado não tem o formato esperado; registre uma referência válida antes de comparar.</p>}
            <label className="label" htmlFor={`hash-verify-value-${evidence.id}`}>Hash calculado ou colado</label>
            <input
              id={`hash-verify-value-${evidence.id}`}
              className="input font-mono"
              inputMode="text"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={`${HASH_LENGTHS[verification.algorithm]} caracteres hexadecimais`}
              maxLength={HASH_LENGTHS[verification.algorithm]}
              disabled={verification.calculating}
              value={verification.value}
              onChange={(event) => setVerification({ ...verification, value: event.target.value, source: "", progress: 0 })}
            />
            <label className="label" htmlFor={`hash-verify-file-${evidence.id}`}>Ou calcule a partir de um arquivo</label>
            <input
              id={`hash-verify-file-${evidence.id}`}
              className="input text-xs"
              type="file"
              disabled={verification.calculating}
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                if (!file) return;
                setVerifyError(null);
                setVerification({ ...verification, value: "", source: file.name.slice(0, 120), progress: 0, calculating: true });
                try {
                  const value = await hashFileInBrowser(file, verification.algorithm, (progress) => {
                    setVerification((current) => ({ ...current, progress }));
                  });
                  setVerification((current) => ({ ...current, value, source: file.name.slice(0, 120), progress: 100, calculating: false }));
                } catch {
                  setVerification((current) => ({ ...current, value: "", source: "", calculating: false }));
                  setVerifyError("Não foi possível calcular o hash deste arquivo no navegador.");
                } finally {
                  input.value = "";
                }
              }}
            />
            {verification.calculating && <p role="status" aria-live="polite" className="text-xs text-gray-500">Calculando localmente… {verification.progress}%</p>}
            {verification.source && <p className="break-all text-xs text-gray-500">Origem: {verification.source}</p>}
            {verification.value && !validCandidate && <p className="notice notice-warn text-xs">O valor informado não tem o formato esperado para {verification.algorithm}.</p>}
            {matches === true && <p className="notice notice-ok" role="status" aria-live="polite"><strong>✓ CONFERE</strong> — o valor coincide com a referência registrada.</p>}
            {matches === false && <p className="notice notice-crit font-bold" role="alert" aria-live="assertive"><strong>⚠ DIVERGE</strong> — o valor não coincide com a referência registrada.</p>}
            {verifyError && <p className="text-xs text-crit" role="alert">{verifyError}</p>}
            <button
              type="button"
              className="btn-primary text-xs"
              disabled={matches === null || verifySaving}
              onClick={async () => {
                if (matches === null) return;
                setVerifyError(null);
                setVerifySaving(true);
                const action = matches ? "VERIFICACAO_HASH_CONFERE" : "VERIFICACAO_HASH_DIVERGE";
                const result = matches ? "CONFERE" : "DIVERGE";
                const reason = `Verificação ${verification.algorithm}: ${result}; referência ${reference.value.trim().toLowerCase()}; valor verificado ${candidate.toLowerCase()}; origem: ${verification.source || "valor colado"}.`;
                try {
                  await post(`/api/evidences/${evidence.id}/custody`, { action, reason });
                  setVerification({ algorithm: verification.algorithm, value: "", source: "", progress: 0, calculating: false });
                  toast(`Resultado ${result} registrado na cadeia de custódia.`, matches ? "ok" : "warn");
                } catch (err: any) {
                  setVerifyError(err.message);
                } finally {
                  setVerifySaving(false);
                }
              }}
            >
              {verifySaving ? "Registrando…" : "Confirmar e registrar na custódia"}
            </button>
          </section>
        )}
      </div>
      <div>
        <h3 className="text-xs font-semibold text-gray-700 mb-2">Cadeia de custódia</h3>
        <ul className="text-xs space-y-1 mb-3">
          {evidence.custodyEvents.map((c: any) => (
            <li key={c.id}>
              {new Date(c.occurredAt).toLocaleString("pt-BR")} — {c.action} · {c.fromCustodian ? `${c.fromCustodian} → ` : ""}{c.toCustodian}
              {c.reason && <span className="block text-gray-500">{c.reason}</span>}
            </li>
          ))}
          {evidence.custodyEvents.length === 0 && <li className="text-gray-400">Nenhum evento registrado.</li>}
        </ul>
        {canEdit && (
          <form
            className="space-y-2"
            onSubmit={async (e) => {
              e.preventDefault(); setCustodyError(null);
              try { await post(`/api/evidences/${evidence.id}/custody`, custodyForm); setCustodyForm({ action: "TRANSFERENCIA", reason: "" }); }
              catch (err: any) { setCustodyError(err.message); }
            }}
          >
            <p className="text-xs text-gray-500">Caso {caseCode} · {actorName} · data e hora preenchidas ao registrar.</p>
            <label className="label" htmlFor={`custody-action-${evidence.id}`}>Ação</label>
            <select
              id={`custody-action-${evidence.id}`}
              className="input"
              value={custodyForm.action}
              onChange={(event) => setCustodyForm({ ...custodyForm, action: event.target.value })}
            >
              {CUSTODY_ACTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="label" htmlFor={`custody-reason-${evidence.id}`}>Motivo</label>
            <textarea id={`custody-reason-${evidence.id}`} className="input min-h-20" required minLength={3} maxLength={500} placeholder="Descreva o motivo da movimentação" value={custodyForm.reason} onChange={(event) => setCustodyForm({ ...custodyForm, reason: event.target.value })} />
            {custodyError && <p className="text-xs text-crit" role="alert">{custodyError}</p>}
            <button type="submit" className="btn-secondary text-xs">Registrar movimentação</button>
          </form>
        )}
      </div>
    </div>
  );
}

function RelationshipsTab({ kase, canEdit, post }: { kase: Kase; canEdit: boolean; post: any }) {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState({ sourceType: "Person", sourceId: "", targetType: "Device", targetId: "", label: "" });
  const [error, setError] = useState<string | null>(null);

  async function patch(url: string, body: unknown) {
    const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Erro ao salvar");
    router.refresh();
    return data;
  }

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
      <details open className="card p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-800">Como usar o mapa de relacionamentos</summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600">
          <li>Cadastre primeiro pessoas, dispositivos, evidências, achados ou eventos nas abas correspondentes.</li>
          <li>Em “Criar conexão”, escolha o tipo e o item de origem, depois o tipo e o item de destino.</li>
          <li>Adicione um rótulo curto que explique o vínculo (por exemplo, “utilizou”, “pertence a” ou “associado a”) e clique em “Criar conexão”.</li>
          <li>No mapa, use a busca e os filtros coloridos para localizar ou ocultar tipos; arraste itens para organizar o layout salvo.</li>
          <li>Use os botões de zoom, o minimapa e “Enquadrar mapa” para navegar. Clique em um item para ver sua seleção; clique no fundo para limpar.</li>
          <li>Se tiver permissão de edição, conecte itens arrastando de um ponto lateral ao outro. Clique em uma conexão para alterar o rótulo ou removê-la.</li>
        </ol>
        <p className="mt-2 text-xs text-gray-500">As posições e conexões ficam salvas no caso. Somente ADMIN e PERITO podem alterá-las.</p>
      </details>
      <RelationshipGraph
        entities={graphEntities}
        relationships={kase.relationships}
        positions={kase.relationshipNodePositions}
        editable={canEdit}
        onCreateRelationship={async (sourceType, sourceId, targetType, targetId) => {
          await post(`/api/cases/${kase.id}/relationships`, { sourceType, sourceId, targetType, targetId, label: "relacionado a" });
          toast("Conexão criada.", "ok");
        }}
        onSavePosition={async (entityType, entityId, x, y) => {
          try {
            const res = await fetch(`/api/cases/${kase.id}/relationships/positions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ positions: [{ entityType, entityId, x, y }] })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Não foi possível salvar a posição.");
          } catch (error) {
            toast(error instanceof Error ? error.message : "Não foi possível salvar a posição.", "error");
          }
        }}
        onUpdateRelationship={async (relationshipId, label) => {
          await patch(`/api/cases/${kase.id}/relationships/${relationshipId}`, { label });
          toast("Rótulo da conexão atualizado.", "ok");
        }}
        onDeleteRelationship={async (relationshipId) => {
          const res = await fetch(`/api/cases/${kase.id}/relationships/${relationshipId}`, { method: "DELETE" });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error ?? "Não foi possível excluir a conexão.");
          router.refresh();
          toast("Conexão removida.", "ok");
        }}
      />

      {canEdit && (
        <form
          className="card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5"
          onSubmit={async (e) => {
            e.preventDefault(); setError(null);
            if (!form.sourceId || !form.targetId) { setError("Selecione o tipo e o item de origem e destino."); return; }
            try { await post(`/api/cases/${kase.id}/relationships`, form); }
            catch (err: any) { setError(err.message); }
          }}
        >
          <h3 className="text-sm font-semibold text-gray-800 sm:col-span-2 xl:col-span-5">Criar conexão</h3>
          <div>
            <label className="label">Origem — tipo</label>
            <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value, sourceId: "" })}>
              {Object.keys(entityOptions).map((t) => <option key={t} value={t}>{RELATIONSHIP_TYPE_LABEL[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Origem — item</label>
            <select required className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
              <option value="">Selecione</option>
              {entityOptions[form.sourceType]?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destino — tipo</label>
            <select className="input" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, targetId: "" })}>
              {Object.keys(entityOptions).map((t) => <option key={t} value={t}>{RELATIONSHIP_TYPE_LABEL[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destino — item</label>
            <select required className="input" value={form.targetId} onChange={(e) => setForm({ ...form, targetId: e.target.value })}>
              <option value="">Selecione</option>
              {entityOptions[form.targetType]?.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Rótulo</label>
            <input className="input" placeholder="ex.: utilizou, associado a" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <button className="btn-primary text-sm sm:col-span-2 xl:col-span-5">Criar conexão</button>
          {error && <p role="alert" className="text-xs text-red-600 sm:col-span-2 xl:col-span-5">{error}</p>}
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
