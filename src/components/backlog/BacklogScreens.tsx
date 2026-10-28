"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Activity, Archive, Bot, Check, CircleHelp, Clock3, Download, FileArchive, FileDown, FileText, LockKeyhole, Plug, Plus, RefreshCw, Send, Settings2, ShieldCheck, Sparkles, Trash2, Users, Workflow } from "lucide-react";

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
  eyebrow,
  title,
  description
}: {
  icon?: typeof Activity;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-2">
      <div className="eyebrow mb-1">{eyebrow}</div>
      <h1 className="font-display text-2xl font-semibold text-gray-900 md:text-3xl">{title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-gray-500">{description}</p>
    </div>
  );
}

function PrototypeNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-gray-700">
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
      className="card rise fixed bottom-4 right-4 z-[70] flex max-w-sm items-start gap-3 p-4 text-sm text-gray-800"
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
}: ScreenProps & { section: "analyses" | "backup" }) {
  if (section === "analyses") return <AnalysesScreen analyses={analyses} cases={cases} caseCount={caseCount} toolCount={toolCount} tools={tools} canEdit={canEdit} />;
  return <BackupScreen />;
}
