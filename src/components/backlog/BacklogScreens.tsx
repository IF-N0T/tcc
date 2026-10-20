"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Archive,
  Bot,
  Check,
  CircleHelp,
  Clock3,
  Download,
  FileArchive,
  FileDown,
  FileText,
  LockKeyhole,
  Plug,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Workflow
} from "lucide-react";

type CaseOption = {
  id: string;
  code: string;
  name: string;
  evidences?: { id: string; code: string; description: string }[];
};
type AnalysisRecord = {
  id: string;
  code: string;
  type: string;
  performedAt: Date | string;
  procedure: string | null;
  result: string | null;
  conclusion: string | null;
  case: CaseOption;
  evidence: { code: string; description: string };
  performedBy: { name: string };
  tool: { name: string } | null;
};
type UserRecord = { id: string; name: string; email: string; role: string; createdAt: Date | string };
type ToolRecord = { id: string; name: string; vendor: string | null; version: string | null; analysesCount: number };
type ReportVersion = { id: string; version: number; title: string; format: string; createdAt: Date | string; case: { id: string; code: string; name: string }; author: { name: string } };
type AssistantResult = { id: string; kind: string; code: string; title: string; detail: string; caseId: string; caseCode: string };

type ScreenProps = {
  analyses?: AnalysisRecord[];
  cases?: CaseOption[];
  caseCount?: number;
  toolCount?: number;
  users?: UserRecord[];
  tools?: ToolRecord[];
  reportVersions?: ReportVersion[];
  canEdit?: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  PERITO: "Perito",
  VISUALIZADOR: "Visualizador"
};

function ScreenHeader({
  icon: Icon,
  eyebrow,
  title,
  description
}: {
  icon: typeof Activity;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">
          <Icon size={20} aria-hidden="true" />
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
            {eyebrow}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        <Check size={13} aria-hidden="true" />
        Funcional
      </span>
    </div>
  );
}

function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
      <CircleHelp className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <FileText size={20} aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-gray-800">{title}</p>
      <p className="mt-1 max-w-md text-xs leading-5 text-gray-500">{description}</p>
    </div>
  );
}

function Feedback({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border border-amber-200 bg-white p-4 text-sm text-gray-800 shadow-xl dark:border-amber-900 dark:bg-ink-800 dark:text-gray-100"
    >
      <CircleHelp size={18} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onDismiss} className="text-xs text-gray-500 hover:text-gray-900" aria-label="Fechar aviso">
        Fechar
      </button>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
  action
}: {
  title: string;
  icon?: typeof Activity;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="card min-w-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          {Icon && <Icon size={16} className="text-brand-700" aria-hidden="true" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function AnalysesScreen({ analyses = [], cases = [], caseCount, toolCount = 0, tools = [], canEdit = false }: ScreenProps) {
  const router = useRouter();
  const [caseId, setCaseId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedCase = cases.find((item) => item.id === caseId);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          evidenceId,
          type: form.get("type"),
          toolId: form.get("toolId"),
          procedure: form.get("procedure"),
          result: form.get("result"),
          conclusion: form.get("conclusion")
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível registrar a análise.");
      formElement.reset();
      setCaseId("");
      setEvidenceId("");
      setMessage(`Análise ${data.code} registrada com sucesso.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a análise.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader
        icon={Workflow}
        eyebrow="Backlog do produto"
        title="Análises forenses"
        description="Organize procedimentos técnicos e resultados vinculados a casos e evidências."
      />
      <PrototypeNotice>Cadastre análises manualmente ou importe resultados de ferramentas cadastradas. Os registros e vínculos são persistidos e auditados.</PrototypeNotice>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-gray-500">Análises registradas</div><div className="mt-1 text-2xl font-semibold text-gray-900">{analyses.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Casos disponíveis</div><div className="mt-1 text-2xl font-semibold text-gray-900">{caseCount ?? cases.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Ferramentas cadastradas</div><div className="mt-1 text-2xl font-semibold text-gray-900">{toolCount}</div></div>
      </div>
      {canEdit && <Card title="Registrar análise" icon={Plus}>
        <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="analysis-type">Tipo de análise</label><input id="analysis-type" name="type" className="input" required minLength={2} maxLength={120} placeholder="Ex.: análise de metadados" /></div>
          <div><label className="label" htmlFor="analysis-case">Caso</label><select id="analysis-case" className="input" required value={caseId} onChange={(event) => { setCaseId(event.target.value); setEvidenceId(""); }}><option value="">Selecione um caso</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
          <div><label className="label" htmlFor="analysis-evidence">Evidência</label><select id="analysis-evidence" className="input" required disabled={!selectedCase} value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">{selectedCase ? "Selecione uma evidência" : "Selecione um caso primeiro"}</option>{selectedCase?.evidences?.map((evidence) => <option key={evidence.id} value={evidence.id}>{evidence.code} · {evidence.description}</option>)}</select></div>
          <div><label className="label" htmlFor="analysis-tool">Ferramenta (opcional)</label><select id="analysis-tool" name="toolId" className="input" defaultValue=""><option value="">Sem ferramenta associada</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}{tool.version ? ` · ${tool.version}` : ""}</option>)}</select></div>
          <div><label className="label" htmlFor="analysis-procedure">Procedimento executado</label><textarea id="analysis-procedure" name="procedure" className="input min-h-20" required minLength={3} maxLength={10000} placeholder="Descreva o procedimento realizado" /></div>
          <div><label className="label" htmlFor="analysis-result">Resultado</label><textarea id="analysis-result" name="result" className="input min-h-20" maxLength={20000} placeholder="Resultados observados" /></div>
          <div><label className="label" htmlFor="analysis-conclusion">Conclusão</label><textarea id="analysis-conclusion" name="conclusion" className="input min-h-20" maxLength={10000} placeholder="Conclusão técnica" /></div>
          <div className="sm:col-span-2"><button className="btn-primary w-full sm:w-auto" type="submit" disabled={loading}><Plus size={16} className="mr-2" />{loading ? "Salvando..." : "Registrar análise"}</button></div>
        </form>
      </Card>}
      <Card title="Registros de análise" icon={Activity}>
        {analyses.length === 0 ? (
          <EmptyState title="Nenhuma análise registrada" description="Quando houver análises persistidas, elas serão exibidas aqui." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base min-w-[760px]">
              <thead><tr><th>Código / Tipo</th><th>Caso e evidência</th><th>Ferramenta</th><th>Responsável</th><th>Data</th></tr></thead>
              <tbody>
                {analyses.map((analysis) => (
                  <tr key={analysis.id}>
                    <td><div className="font-mono text-xs text-brand-700">{analysis.code}</div><div className="mt-1">{analysis.type}</div></td>
                    <td><div>{analysis.case.code} · {analysis.case.name}</div><div className="mt-1 text-xs text-gray-500">{analysis.evidence.code} · {analysis.evidence.description}</div></td>
                    <td>{analysis.tool?.name ?? "—"}</td>
                    <td>{analysis.performedBy.name}</td>
                    <td className="whitespace-nowrap">{new Date(analysis.performedAt).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {analyses.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {analyses.slice(0, 2).map((analysis) => (
            <Card key={`${analysis.id}-summary`} title={`${analysis.code} · ${analysis.type}`}>
              <div className="space-y-3 p-4 text-sm">
                <div><div className="label">Procedimento</div><p className="text-gray-700">{analysis.procedure || "Não informado"}</p></div>
                <div><div className="label">Resultado</div><p className="text-gray-700">{analysis.result || "Não informado"}</p></div>
                <div><div className="label">Conclusão</div><p className="text-gray-700">{analysis.conclusion || "Não informada"}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function ReportsScreen({ cases = [], reportVersions = [], canEdit = false }: ScreenProps) {
  const [caseId, setCaseId] = useState("");
  const [format, setFormat] = useState("JSON");
  const [documentType, setDocumentType] = useState("case-package");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId) {
      setMessage("Selecione um caso para preparar o relatório.");
      return;
    }
    void exportReport();
  }

  async function exportReport() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(caseId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível gerar o relatório.");
      const exportData = documentType === "laudo" ? {
        id: data.id,
        code: data.code,
        name: data.name,
        description: data.description,
        status: data.status,
        priority: data.priority,
        responsible: data.responsible,
        openedAt: data.openedAt,
        closedAt: data.closedAt,
        peopleCount: data.people.length,
        devicesCount: data.devices.length,
        evidenceCount: data.evidences.length,
        findings: data.findings,
        analyses: data.analyses.map((item: Record<string, unknown>) => ({
          code: item.code,
          type: item.type,
          procedure: item.procedure,
          result: item.result,
          conclusion: item.conclusion,
          performedAt: item.performedAt
        }))
      } : data;
      let savedVersion: number | undefined;
      if (canEdit) {
        const selectedCase = cases.find((item) => item.id === caseId);
        const versionResponse = await fetch(`/api/reports/${encodeURIComponent(caseId)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `${documentType === "laudo" ? "Resumo para laudo" : "Pacote completo"} · ${selectedCase?.code ?? data.code}`,
            format: "JSON"
          })
        });
        const versionData = await versionResponse.json();
        if (!versionResponse.ok) throw new Error(versionData.error ?? "O relatório foi preparado, mas não foi possível salvar uma versão.");
        savedVersion = versionData.version;
      }
      let contents: string;
      let mimeType: string;
      let extension: string;
      if (format === "CSV") {
        const rows: string[][] = [["seção", "código", "registro", "detalhes"]];
        rows.push(["Caso", exportData.code, exportData.name, `Status: ${exportData.status}; prioridade: ${exportData.priority}; responsável: ${exportData.responsible.name}`]);
        if (documentType === "laudo") {
          rows.push(["Resumo", exportData.code, "Pessoas / dispositivos / evidências", `${exportData.peopleCount} / ${exportData.devicesCount} / ${exportData.evidenceCount}`]);
          for (const item of exportData.findings) rows.push(["Achado", item.code, item.title, item.description]);
          for (const item of exportData.analyses) rows.push(["Análise", item.code, item.type, `${item.procedure ?? "—"}; resultado: ${item.result ?? "—"}; conclusão: ${item.conclusion ?? "—"}`]);
        } else {
          for (const item of data.people) rows.push(["Pessoa", item.code, item.name, [item.role, item.email, item.phone].filter(Boolean).join(" · ")]);
          for (const item of data.devices) rows.push(["Dispositivo", item.code, `${item.brand ?? ""} ${item.model ?? ""}`.trim(), `${item.type}; série: ${item.serialNumber ?? "—"}; IMEI: ${item.imei ?? "—"}`]);
          for (const item of data.evidences) {
            rows.push(["Evidência", item.code, item.description, `Categoria: ${item.category}; tipo: ${item.type}`]);
            for (const hash of item.hashes) rows.push(["Hash", hash.id, `${item.code} · ${hash.algorithm}`, hash.value]);
            for (const custody of item.custodyEvents) rows.push(["Cadeia de custódia", custody.id, `${item.code} · ${custody.action}`, `${custody.toCustodian}; ${custody.location ?? ""}; ${custody.reason ?? ""}`]);
          }
          for (const item of data.findings) rows.push(["Achado", item.code, item.title, item.description]);
          for (const item of data.analyses) rows.push(["Análise", item.code, item.type, `${item.evidence.code}; procedimento: ${item.procedure ?? "—"}; resultado: ${item.result ?? "—"}; conclusão: ${item.conclusion ?? "—"}`]);
          for (const item of data.tasks) rows.push(["Tarefa", item.id, item.title, item.status]);
          for (const item of data.events) rows.push(["Evento", item.id, item.title, `${item.occurredAt}; ${item.description ?? ""}`]);
          for (const item of data.relationships) rows.push(["Relacionamento", item.id, `${item.sourceType}:${item.sourceId} → ${item.targetType}:${item.targetId}`, item.label ?? ""]);
        }
        const escapeCell = (value: string) => {
          const safe = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
          return `"${safe.replace(/"/g, '""')}"`;
        };
        contents = `\uFEFF${rows.map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
        mimeType = "text/csv;charset=utf-8";
        extension = "csv";
      } else if (format === "HTML") {
        const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
          "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
        })[character] ?? character);
        const sections: [string, Record<string, unknown>[], string, string][] = documentType === "laudo" ? [
          ["Achados", exportData.findings, "title", "description"],
          ["Análises", exportData.analyses, "type", "conclusion"]
        ] : [
          ["Pessoas", data.people, "name", "role"],
          ["Dispositivos", data.devices, "model", "type"],
          ["Evidências", data.evidences, "description", "category"],
          ["Achados", data.findings, "title", "description"],
          ["Análises", data.analyses, "type", "result"],
          ["Tarefas", data.tasks, "title", "status"],
          ["Eventos", data.events, "title", "description"],
          ["Relacionamentos", data.relationships, "sourceType", "label"]
        ];
        const summary = documentType === "laudo" ? `<p>Período: ${escapeHtml(new Date(data.openedAt).toLocaleDateString("pt-BR"))} a ${escapeHtml(data.closedAt ? new Date(data.closedAt).toLocaleDateString("pt-BR") : "em andamento")}</p><p>Pessoas: ${exportData.peopleCount} · Dispositivos: ${exportData.devicesCount} · Evidências: ${exportData.evidenceCount}</p>` : "";
        const evidenceSections = documentType === "laudo" ? "" : data.evidences.map((evidence: Record<string, unknown>) => {
          const hashes = evidence.hashes as Record<string, unknown>[];
          const custodyEvents = evidence.custodyEvents as Record<string, unknown>[];
          return `<h3>${escapeHtml(evidence.code)} — ${escapeHtml(evidence.description)}</h3><h4>Hashes</h4><ul>${hashes.map((hash) => `<li>${escapeHtml(hash.algorithm)}: ${escapeHtml(hash.value)}</li>`).join("") || "<li>Nenhum hash registrado.</li>"}</ul><h4>Cadeia de custódia</h4><ul>${custodyEvents.map((event) => `<li>${escapeHtml(event.occurredAt)} · ${escapeHtml(event.action)} · ${escapeHtml(event.toCustodian)} · ${escapeHtml(event.location)}</li>`).join("") || "<li>Nenhum evento registrado.</li>"}</ul>`;
        }).join("");
        contents = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${escapeHtml(data.code)} — ${escapeHtml(data.name)}</title><style>body{font:14px system-ui;max-width:900px;margin:40px auto;color:#222}h1,h2{color:#43341f}table{width:100%;border-collapse:collapse;margin:12px 0 28px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:8px;vertical-align:top}@media print{button{display:none}body{margin:0}}</style><button onclick="window.print()">Imprimir / salvar como PDF</button><h1>${escapeHtml(data.code)} — ${escapeHtml(data.name)}</h1><p>Status: ${escapeHtml(data.status)} · Prioridade: ${escapeHtml(data.priority)} · Responsável: ${escapeHtml(data.responsible.name)}</p><p>${escapeHtml(data.description || "")}</p>${summary}${sections.map(([title, items, primary, secondary]) => `<h2>${title}</h2>${items.length ? `<table><thead><tr><th>Código</th><th>${title}</th><th>Detalhes</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item[primary])}</td><td>${escapeHtml(item[secondary])}</td></tr>`).join("")}</tbody></table>` : "<p>Nenhum registro.</p>"}`).join("")}${evidenceSections}<p>Relatório gerado em ${new Date().toLocaleString("pt-BR")}</p></html>`;
        mimeType = "text/html;charset=utf-8";
        extension = "html";
      } else {
        contents = JSON.stringify(exportData, null, 2);
        mimeType = "application/json;charset=utf-8";
        extension = "json";
      }
      const blob = new Blob([contents], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${data.code}-${format.toLowerCase()}.${extension}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      const versionMessage = savedVersion ? ` Versão ${savedVersion} arquivada no histórico.` : "";
      setMessage((format === "HTML" ? "Relatório pronto. Abra o arquivo e use “Imprimir / salvar como PDF” para gerar um PDF." : `Exportação ${extension.toUpperCase()} baixada.`) + versionMessage);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={FileText} eyebrow="Relatórios" title="Laudos e relatórios" description="Gere exportações e consulte o histórico versionado dos documentos." />
      <PrototypeNotice>As exportações consultam o caso e seus registros atualizados no banco. O arquivo JSON inclui a cadeia de custódia e os hashes para preservar o contexto do caso.</PrototypeNotice>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Card title="Preparar documento" icon={FileDown}>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div>
              <label className="label" htmlFor="report-case">Caso</label>
              <select id="report-case" className="input" value={caseId} onChange={(event) => setCaseId(event.target.value)} required>
                <option value="">Selecione um caso</option>
                {cases.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="report-kind">Tipo de documento</label>
              <select id="report-kind" className="input" value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="case-package">Pacote completo do caso</option><option value="laudo">Resumo para laudo</option></select>
            </div>
            <fieldset>
              <legend className="label">Formato de saída</legend>
              <div className="flex flex-wrap gap-2">
                {["JSON", "CSV", "HTML"].map((item) => (
                  <label key={item} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${format === item ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200" : "border-gray-200 text-gray-600"}`}>
                    <input className="sr-only" type="radio" name="report-format" value={item} checked={format === item} onChange={() => setFormat(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn-primary w-full sm:w-auto" type="submit" disabled={loading}><FileDown size={16} className="mr-2" />{loading ? "Gerando..." : "Baixar relatório"}</button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="Histórico de versões (JSON)" icon={Clock3}>
            {reportVersions.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">As versões geradas aparecerão aqui.</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {reportVersions.slice(0, 10).map((version) => (
                  <div key={version.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0"><div className="truncate font-medium text-gray-800">{version.case.code} · v{version.version}</div><div className="truncate text-xs text-gray-500">{version.title} · {new Date(version.createdAt).toLocaleString("pt-BR")} · {version.author.name}</div></div>
                    <a className="shrink-0 text-xs font-medium text-brand-700 hover:underline" href={`/api/reports/${version.case.id}/versions/${version.id}`}>Baixar JSON</a>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Formatos disponíveis" icon={FileDown}>
            <div className="p-4 text-sm text-gray-500">JSON e CSV são baixados diretamente. O HTML inclui um layout imprimível para salvar como PDF pelo navegador.</div>
          </Card>
          <Card title="Pacote do caso" icon={FileArchive}>
            <div className="p-4 text-sm text-gray-500">O pacote inclui evidências, hashes, cadeia de custódia, pessoas, dispositivos, achados, análises, tarefas, eventos e relacionamentos.</div>
          </Card>
        </div>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function AssistantScreen() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AssistantResult[]>([]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      setMessage("Digite uma pergunta antes de continuar.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: prompt })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível buscar registros.");
      setResults(data.results);
      setMessage(data.message);
      setPrompt("");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível buscar registros.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Bot} eyebrow="Pesquisa local" title="Assistente Sherlock" description="Pesquise casos, evidências, achados, análises e tarefas registrados no banco de dados." />
      <PrototypeNotice>Este assistente faz busca textual local; não usa IA generativa nem produz conclusões periciais. Verifique os registros originais antes de qualquer uso.</PrototypeNotice>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card title="Conversa" icon={Sparkles}>
          <div className="flex min-h-[360px] flex-col justify-between gap-5 p-4 sm:p-6">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-900 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-100">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Bot size={16} /> Assistente Sherlock <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium dark:bg-black/20">busca no banco</span></div>
              {message || "Escreva termos de busca para localizar registros. Nenhum dado é enviado a um provedor externo."}
            </div>
            <form onSubmit={handleSubmit} className="space-y-2">
              <label className="label" htmlFor="assistant-prompt">O que deseja localizar?</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="assistant-prompt" className="input" required minLength={2} maxLength={240} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: CAS-2026-0001, smartphone, hash" />
                <button type="submit" className="btn-primary shrink-0" disabled={loading}><Send size={15} className="mr-2" />{loading ? "Buscando..." : "Pesquisar"}</button>
              </div>
            </form>
          </div>
          {results.length > 0 && (
            <div className="border-t border-gray-100 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Registros encontrados ({results.length})</div>
              <ul className="space-y-2">
                {results.map((result) => (
                  <li key={`${result.kind}-${result.id}`} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full bg-brand-50 px-2 py-1 font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200">{result.kind}</span><span className="font-mono text-gray-500">{result.code}</span></div>
                    <div className="mt-1 text-sm font-medium text-gray-800">{result.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-gray-500">{result.detail}</div>
                    <a className="mt-2 inline-block text-xs font-medium text-brand-700 hover:underline" href={`/cases/${result.caseId}`}>Abrir caso {result.caseCode}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card title="Boas práticas" icon={ShieldCheck}>
          <ul className="space-y-3 p-4 text-sm text-gray-600">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />Confira fontes e registros originais.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />Preserve a cadeia de custódia.</li>
            <li className="flex gap-2"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-700" />A busca é limitada aos registros que sua sessão pode acessar.</li>
          </ul>
        </Card>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function IntegrationsScreen({ tools = [], cases = [], canEdit = false }: ScreenProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [toolId, setToolId] = useState("");

  async function handleToolSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      const response = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: values.get("name"), vendor: values.get("vendor"), version: values.get("version") })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível cadastrar a ferramenta.");
      form.reset();
      setMessage(`Ferramenta “${data.name}” cadastrada.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar a ferramenta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId || !toolId) {
      setMessage("Selecione a ferramenta e o caso antes de importar.");
      return;
    }
    setImporting(true);
    setMessage("");
    const form = event.currentTarget;
    const file = new FormData(form).get("import-file");
    if (!(file instanceof File) || file.size === 0) {
      setMessage("Selecione um arquivo JSON para importar.");
      setImporting(false);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage("O arquivo excede o limite de 2 MB.");
      setImporting(false);
      return;
    }
    try {
      const parsedFile: unknown = JSON.parse(await file.text());
      const rows = Array.isArray(parsedFile) ? parsedFile : (parsedFile as { rows?: unknown }).rows;
      if (!Array.isArray(rows)) throw new Error("O arquivo deve conter uma lista JSON de análises ou um objeto com a propriedade “rows”.");
      const response = await fetch("/api/tools/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, caseId, rows })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível importar os resultados.");
      form.reset();
      setCaseId("");
      setToolId("");
      setMessage(`${data.imported} análise(s) importada(s): ${data.codes.join(", ")}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ler o arquivo JSON.");
    } finally {
      setImporting(false);
    }
  }

  async function removeTool(tool: ToolRecord) {
    if (!window.confirm(`Excluir a ferramenta “${tool.name}”?`)) return;
    setMessage("");
    try {
      const response = await fetch(`/api/tools?id=${encodeURIComponent(tool.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível excluir a ferramenta.");
      setMessage("Ferramenta excluída.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível excluir a ferramenta.");
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Plug} eyebrow="Catálogo local" title="Integrações forenses" description="Cadastre ferramentas e importe seus resultados em análises vinculadas a evidências." />
      <PrototypeNotice>O catálogo não se conecta automaticamente a softwares de terceiros. Exporte um arquivo JSON da ferramenta e importe-o aqui; cada resultado válido é salvo como análise auditada.</PrototypeNotice>
      <Card title="Ferramentas cadastradas" icon={Settings2}>
        {tools.length === 0 ? (
          <EmptyState title="Nenhuma ferramenta cadastrada" description="Cadastre uma ferramenta para vinculá-la a análises importadas." />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <div key={tool.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-semibold text-gray-900">{tool.name}</div><div className="mt-1 text-xs text-gray-500">{tool.vendor || "Fabricante não informado"}{tool.version ? ` · v${tool.version}` : ""}</div></div>
                  {canEdit && tool.analysesCount === 0 && <button type="button" onClick={() => removeTool(tool)} className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Excluir ${tool.name}`}><Trash2 size={15} /></button>}
                </div>
                <div className="mt-4 text-xs text-gray-500">{tool.analysesCount} análise(s) vinculada(s){tool.analysesCount > 0 ? " · protegida contra exclusão" : ""}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {canEdit && <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Cadastrar ferramenta" icon={Plus}>
          <form onSubmit={handleToolSubmit} className="space-y-3 p-4">
            <div><label className="label" htmlFor="tool-name">Nome</label><input id="tool-name" name="name" className="input" required minLength={2} maxLength={120} placeholder="Ex.: Autopsy" /></div>
            <div><label className="label" htmlFor="tool-vendor">Fabricante</label><input id="tool-vendor" name="vendor" className="input" maxLength={120} /></div>
            <div><label className="label" htmlFor="tool-version">Versão</label><input id="tool-version" name="version" className="input" maxLength={60} /></div>
            <button className="btn-primary" type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar ferramenta"}</button>
          </form>
        </Card>
        <Card title="Importar resultados JSON" icon={FileDown}>
          <form onSubmit={handleImport} className="space-y-3 p-4">
            <div><label className="label" htmlFor="import-tool">Ferramenta</label><select id="import-tool" className="input" required value={toolId} onChange={(event) => setToolId(event.target.value)}><option value="">Selecione</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.name}</option>)}</select></div>
            <div><label className="label" htmlFor="import-case">Caso</label><select id="import-case" className="input" required value={caseId} onChange={(event) => setCaseId(event.target.value)}><option value="">Selecione</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
            <div><label className="label" htmlFor="import-file">Arquivo JSON (máximo 2 MB)</label><input id="import-file" name="import-file" className="input" type="file" accept=".json,application/json" required /></div>
            <details className="text-xs text-gray-500"><summary className="cursor-pointer">Formato esperado</summary><pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-2">{`[{"type":"Análise de metadados","evidenceId":"ID_DA_EVIDENCIA","procedure":"Procedimento aplicado","result":"Resultado","conclusion":"Conclusão"}]`}</pre></details>
            <button className="btn-primary" type="submit" disabled={importing || !tools.length}>{importing ? "Importando..." : "Validar e importar"}</button>
          </form>
        </Card>
      </div>}
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function BackupScreen() {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState("");

  async function downloadBackup() {
    setDownloading(true);
    setMessage("");
    try {
      const response = await fetch("/api/backup");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Não foi possível gerar o backup.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "sherlock-backup.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Backup baixado. Guarde-o em local seguro; ele contém dados pessoais e hashes de senha.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o backup.");
    } finally {
      setDownloading(false);
    }
  }

  async function restoreBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("backup-file");
    if (!(file instanceof File) || !file.size) {
      setMessage("Selecione um arquivo de backup.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setMessage("O arquivo excede o limite de 25 MB.");
      return;
    }
    if (!window.confirm("Restaurar este backup de forma aditiva? Registros com o mesmo ID serão ignorados; os dados atuais não serão substituídos.")) return;
    setRestoring(true);
    setMessage("");
    try {
      const parsedBackup: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedBackup)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível restaurar o backup.");
      setMessage(`Restauração concluída: ${data.total} registro(s) adicionado(s). Os registros já existentes foram preservados.`);
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "O arquivo selecionado não é um backup válido.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Archive} eyebrow="Administração" title="Backup e recuperação" description="Exporte todos os registros ou restaure um backup sem substituir dados atuais." />
      <PrototypeNotice>A restauração é aditiva e transacional: registros existentes são mantidos; IDs repetidos são ignorados. O backup inclui dados pessoais e hashes de senha, portanto guarde o arquivo com acesso restrito.</PrototypeNotice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Exportar backup completo" icon={Download}>
          <div className="space-y-4 p-4">
            <p className="text-sm text-gray-500">Inclui casos, pessoas, dispositivos, evidências, hashes, cadeia de custódia, análises, ferramentas, usuários, tarefas, eventos, achados, relacionamentos e auditoria.</p>
            <button type="button" className="btn-primary" onClick={downloadBackup} disabled={downloading}><Download size={16} className="mr-2" />{downloading ? "Preparando backup..." : "Baixar backup JSON"}</button>
          </div>
        </Card>
        <Card title="Restaurar backup" icon={RefreshCw}>
          <form onSubmit={restoreBackup} className="space-y-4 p-4">
            <div><label className="label" htmlFor="backup-file">Arquivo de backup Sherlock JSON</label><input id="backup-file" name="backup-file" type="file" className="input" accept=".json,application/json" required /></div>
            <p className="text-xs text-gray-500">Limite: 25 MB. A restauração falha sem aplicar alterações se houver conflito de integridade.</p>
            <button type="submit" className="btn-primary" disabled={restoring}><RefreshCw size={16} className="mr-2" />{restoring ? "Restaurando..." : "Restaurar de forma aditiva"}</button>
          </form>
        </Card>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function UsersScreen({ users = [] }: ScreenProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PERITO");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível cadastrar o usuário.");
      setName("");
      setEmail("");
      setRole("PERITO");
      setPassword("");
      setMessage(`Usuário ${data.email} cadastrado como ${ROLE_LABEL[data.role] ?? data.role}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Users} eyebrow="Administração" title="Gestão de usuários" description="Consulte os acessos cadastrados e crie contas para a equipe." />
      <PrototypeNotice>Novas senhas são armazenadas somente como hash. Compartilhe a senha inicial por um canal seguro e solicite que o usuário a altere.</PrototypeNotice>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <Card title="Usuários cadastrados" icon={Users}>
          {users.length === 0 ? (
            <EmptyState title="Nenhum usuário encontrado" description="Os usuários cadastrados aparecerão aqui." />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base min-w-[580px]">
                <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Criado em</th></tr></thead>
                <tbody>{users.map((user) => <tr key={user.id}><td className="font-medium">{user.name}</td><td>{user.email}</td><td>{ROLE_LABEL[user.role] ?? user.role}</td><td className="whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString("pt-BR")}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="Cadastrar usuário" icon={Plus}>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div><label htmlFor="user-name" className="label">Nome completo</label><input id="user-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="Nome da pessoa" /></div>
            <div><label htmlFor="user-email" className="label">E-mail institucional</label><input id="user-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nome@instituicao.gov.br" /></div>
            <div><label htmlFor="user-role" className="label">Perfil de acesso</label><select id="user-role" className="input" value={role} onChange={(event) => setRole(event.target.value)}><option value="PERITO">Perito</option><option value="VISUALIZADOR">Visualizador</option><option value="ADMIN">Administrador</option></select></div>
            <div><label htmlFor="user-password" className="label">Senha inicial</label><input id="user-password" className="input" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} /><p className="mt-1 text-xs text-gray-500">Mínimo de 12 caracteres. A senha nunca é exibida novamente.</p></div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? "Salvando..." : "Cadastrar usuário"}</button>
          </form>
        </Card>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

export default function BacklogScreens({
  section,
  analyses = [],
  cases = [],
  caseCount,
  toolCount,
  users = [],
  tools = [],
  reportVersions = [],
  canEdit = false
}: ScreenProps & { section: "analyses" | "reports" | "assistant" | "integrations" | "backup" | "users" }) {
  if (section === "analyses") return <AnalysesScreen analyses={analyses} cases={cases} caseCount={caseCount} toolCount={toolCount} tools={tools} canEdit={canEdit} />;
  if (section === "reports") return <ReportsScreen cases={cases} reportVersions={reportVersions} canEdit={canEdit} />;
  if (section === "assistant") return <AssistantScreen />;
  if (section === "integrations") return <IntegrationsScreen tools={tools} cases={cases} canEdit={canEdit} />;
  if (section === "backup") return <BackupScreen />;
  return <UsersScreen users={users} />;
}
