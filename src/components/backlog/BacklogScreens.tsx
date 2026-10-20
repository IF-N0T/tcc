"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  Archive,
  Bot,
  Check,
  CircleHelp,
  Clock3,
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

type ScreenProps = {
  analyses?: AnalysisRecord[];
  cases?: CaseOption[];
  caseCount?: number;
  toolCount?: number;
  users?: UserRecord[];
  tools?: ToolRecord[];
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
        <CircleHelp size={13} aria-hidden="true" />
        Em planejamento
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

function AnalysesScreen({ analyses = [], cases = [], caseCount, toolCount = 0 }: ScreenProps) {
  const [caseId, setCaseId] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [message, setMessage] = useState("");
  const selectedCase = cases.find((item) => item.id === caseId);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Análise não salva: o cadastro ainda não possui API. Nenhuma alteração foi persistida.");
  }

  return (
    <div className="space-y-6">
      <ScreenHeader
        icon={Workflow}
        eyebrow="Backlog do produto"
        title="Análises forenses"
        description="Organize procedimentos técnicos e resultados vinculados a casos e evidências."
      />
      <PrototypeNotice>
        O cadastro de análises ainda não está disponível. Os registros abaixo, quando existentes, vêm do banco de dados; esta tela não cria nem altera informações.
      </PrototypeNotice>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><div className="text-xs text-gray-500">Análises registradas</div><div className="mt-1 text-2xl font-semibold text-gray-900">{analyses.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Casos disponíveis</div><div className="mt-1 text-2xl font-semibold text-gray-900">{caseCount ?? cases.length}</div></div>
        <div className="card p-4"><div className="text-xs text-gray-500">Ferramentas cadastradas</div><div className="mt-1 text-2xl font-semibold text-gray-900">{toolCount}</div></div>
      </div>
      <Card title="Prévia de nova análise" icon={Plus}>
        <form onSubmit={handleSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
          <div><label className="label" htmlFor="analysis-type">Tipo de análise</label><input id="analysis-type" className="input" required minLength={2} placeholder="Ex.: análise de metadados" /></div>
          <div><label className="label" htmlFor="analysis-case">Caso</label><select id="analysis-case" className="input" required value={caseId} onChange={(event) => { setCaseId(event.target.value); setEvidenceId(""); }}><option value="">Selecione um caso</option>{cases.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></div>
          <div><label className="label" htmlFor="analysis-evidence">Evidência</label><select id="analysis-evidence" className="input" required disabled={!selectedCase} value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)}><option value="">{selectedCase ? "Selecione uma evidência" : "Selecione um caso primeiro"}</option>{selectedCase?.evidences?.map((evidence) => <option key={evidence.id} value={evidence.id}>{evidence.code} · {evidence.description}</option>)}</select></div>
          <div><label className="label" htmlFor="analysis-procedure">Procedimento planejado</label><input id="analysis-procedure" className="input" required minLength={3} placeholder="Descreva o procedimento" /></div>
          <div className="sm:col-span-2"><button className="btn-primary w-full sm:w-auto" type="submit"><Plus size={16} className="mr-2" /> Pré-visualizar cadastro</button></div>
        </form>
      </Card>
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

function ReportsScreen({ cases = [] }: ScreenProps) {
  const [caseId, setCaseId] = useState("");
  const [format, setFormat] = useState("PDF");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caseId) {
      setMessage("Selecione um caso para preparar o relatório.");
      return;
    }
    setMessage(`O relatório ${format} não foi gerado: exportação e versionamento ainda não estão implementados.`);
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={FileText} eyebrow="Backlog do produto" title="Laudos e relatórios" description="Prepare documentos periciais versionados e pacotes de caso para exportação." />
      <PrototypeNotice>Os dados de casos desta tela vêm do banco. A geração de laudos, versões e arquivos ainda não está conectada; enviar o formulário não cria nem baixa documentos.</PrototypeNotice>
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
              <select id="report-kind" className="input" defaultValue="laudo"><option value="laudo">Laudo pericial</option><option value="case-package">Pacote do caso</option><option value="summary">Resumo executivo</option></select>
            </div>
            <fieldset>
              <legend className="label">Formato de saída</legend>
              <div className="flex flex-wrap gap-2">
                {["PDF", "CSV", "JSON", "XLSX"].map((item) => (
                  <label key={item} className={`cursor-pointer rounded-lg border px-3 py-2 text-sm ${format === item ? "border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-950/40 dark:text-brand-200" : "border-gray-200 text-gray-600"}`}>
                    <input className="sr-only" type="radio" name="report-format" value={item} checked={format === item} onChange={() => setFormat(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <button className="btn-primary w-full sm:w-auto" type="submit"><FileDown size={16} className="mr-2" /> Preparar exportação</button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="Versionamento" icon={Clock3}>
            <div className="p-4 text-sm text-gray-500">As versões, revisões e responsáveis pelo documento aparecerão aqui quando o módulo de laudos estiver disponível.</div>
          </Card>
          <Card title="Pacote do caso" icon={FileArchive}>
            <div className="p-4 text-sm text-gray-500">O pacote poderá reunir evidências, hashes, cadeia de custódia, achados e documentos do caso.</div>
          </Card>
        </div>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function AssistantScreen() {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) {
      setMessage("Digite uma pergunta antes de continuar.");
      return;
    }
    setMessage("Sua pergunta permaneceu somente nesta tela e não foi enviada: o assistente de IA ainda não está conectado.");
    setPrompt("");
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Bot} eyebrow="Backlog do produto" title="Assistente Sherlock" description="Uma interface planejada para apoiar a consulta e a organização de informações periciais." />
      <PrototypeNotice>Não há modelo de IA conectado. Nenhuma pergunta é enviada ou respondida, e não use este protótipo para inserir informações sensíveis.</PrototypeNotice>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card title="Conversa" icon={Sparkles}>
          <div className="flex min-h-[360px] flex-col justify-between gap-5 p-4 sm:p-6">
            <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm leading-6 text-brand-900 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-100">
              <div className="mb-2 flex items-center gap-2 font-semibold"><Bot size={16} /> Assistente Sherlock <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium dark:bg-black/20">prévia</span></div>
              Esta área poderá ajudar a localizar informações já registradas em casos, evidências e achados. A integração ainda não está disponível.
            </div>
            <form onSubmit={handleSubmit} className="space-y-2">
              <label className="label" htmlFor="assistant-prompt">Escreva uma pergunta de demonstração</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input id="assistant-prompt" className="input" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ex.: resumir evidências de um caso" />
                <button type="submit" className="btn-primary shrink-0"><Send size={15} className="mr-2" /> Enviar</button>
              </div>
            </form>
          </div>
        </Card>
        <Card title="Boas práticas" icon={ShieldCheck}>
          <ul className="space-y-3 p-4 text-sm text-gray-600">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />Confira fontes e registros originais.</li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-green-700" />Preserve a cadeia de custódia.</li>
            <li className="flex gap-2"><LockKeyhole size={16} className="mt-0.5 shrink-0 text-amber-700" />Não use esta prévia para compartilhar dados.</li>
          </ul>
        </Card>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function IntegrationsScreen({ tools = [] }: ScreenProps) {
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Plug} eyebrow="Backlog do produto" title="Integrações forenses" description="Acompanhe ferramentas cadastradas e planeje importações seguras para o fluxo pericial." />
      <PrototypeNotice>O sistema ainda não se conecta a ferramentas de terceiros. Ferramentas cadastradas são lidas do banco, mas esta tela não inicia importações nem testa conexões.</PrototypeNotice>
      <Card title="Ferramentas cadastradas" icon={Settings2}>
        {tools.length === 0 ? (
          <EmptyState title="Nenhuma ferramenta cadastrada" description="O catálogo e a configuração de integrações serão disponibilizados em uma etapa futura." />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {tools.map((tool) => (
              <div key={tool.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><div className="font-semibold text-gray-900">{tool.name}</div><div className="mt-1 text-xs text-gray-500">{tool.vendor || "Fabricante não informado"}{tool.version ? ` · v${tool.version}` : ""}</div></div>
                  <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-600">Sem conexão</span>
                </div>
                <div className="mt-4 text-xs text-gray-500">{tool.analysesCount} análise(s) vinculada(s)</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Importação de resultados", "Receba metadados e relatórios com validação de origem e registro de auditoria."],
          ["Conexões seguras", "Configure credenciais protegidas e monitore conexões sem expor segredos na interface."]
        ].map(([title, description]) => (
          <Card key={title} title={title} icon={Activity}>
            <div className="p-4">
              <p className="text-sm leading-6 text-gray-500">{description}</p>
              <button type="button" onClick={() => setMessage("Configuração indisponível: nenhuma integração pode ser ativada neste protótipo.")} className="btn-secondary mt-4">
                <Plus size={15} className="mr-2" /> Planejar conexão
              </button>
            </div>
          </Card>
        ))}
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function BackupScreen() {
  const [cadence, setCadence] = useState("diario");
  const [retention, setRetention] = useState("30");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("A política não foi salva: agendamento, armazenamento e restauração ainda não estão implementados.");
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Archive} eyebrow="Backlog do produto" title="Backup e recuperação" description="Planeje políticas de cópia, retenção e restauração com trilha de auditoria." />
      <PrototypeNotice>Esta tela não verifica backups, não altera configurações e não restaura dados. A aplicação ainda não possui serviço de backup conectado.</PrototypeNotice>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><div className="flex items-center gap-2 text-xs text-gray-500"><Activity size={15} /> Serviço</div><div className="mt-2 font-semibold text-amber-700">Não configurado</div></div>
        <div className="card p-4"><div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 size={15} /> Último backup</div><div className="mt-2 font-semibold text-gray-900">Sem informação</div></div>
        <div className="card p-4"><div className="flex items-center gap-2 text-xs text-gray-500"><RefreshCw size={15} /> Último teste de restauração</div><div className="mt-2 font-semibold text-gray-900">Sem informação</div></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Política planejada" icon={Settings2}>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div><label className="label" htmlFor="backup-cadence">Frequência desejada</label><select id="backup-cadence" className="input" value={cadence} onChange={(event) => setCadence(event.target.value)}><option value="diario">Diária</option><option value="semanal">Semanal</option></select></div>
            <div><label className="label" htmlFor="backup-retention">Retenção desejada (dias)</label><input id="backup-retention" className="input" type="number" min="1" max="3650" required value={retention} onChange={(event) => setRetention(event.target.value)} /></div>
            <button type="submit" className="btn-primary">Salvar rascunho de política</button>
          </form>
        </Card>
        <Card title="Plano de recuperação" icon={ShieldCheck}>
          <div className="space-y-3 p-4 text-sm">
            {["Definir destino e criptografia dos backups", "Registrar responsáveis e permissões", "Executar teste periódico de restauração", "Auditar cada operação de recuperação"].map((item, index) => (
              <div key={item} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-600">{index + 1}</span><span className="pt-1 text-gray-600">{item}</span></div>
            ))}
          </div>
        </Card>
      </div>
      <Feedback message={message} onDismiss={() => setMessage("")} />
    </div>
  );
}

function UsersScreen({ users = [] }: ScreenProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("PERITO");
  const [message, setMessage] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Usuário não criado: o cadastro pela interface ainda não possui API. Nenhuma senha foi solicitada ou armazenada.");
  }

  return (
    <div className="space-y-6">
      <ScreenHeader icon={Users} eyebrow="Administração" title="Gestão de usuários" description="Consulte os acessos cadastrados e planeje a administração de perfis da equipe." />
      <PrototypeNotice>Esta tela é exclusiva para administradores. A lista abaixo é consultada no banco; o formulário é apenas uma prévia e não cria contas.</PrototypeNotice>
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
        <Card title="Prévia de novo usuário" icon={Plus}>
          <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div><label htmlFor="user-name" className="label">Nome completo</label><input id="user-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="Nome da pessoa" /></div>
            <div><label htmlFor="user-email" className="label">E-mail institucional</label><input id="user-email" className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="nome@instituicao.gov.br" /></div>
            <div><label htmlFor="user-role" className="label">Perfil de acesso</label><select id="user-role" className="input" value={role} onChange={(event) => setRole(event.target.value)}><option value="PERITO">Perito</option><option value="VISUALIZADOR">Visualizador</option><option value="ADMIN">Administrador</option></select></div>
            <button type="submit" className="btn-primary w-full">Pré-visualizar cadastro</button>
            <p className="text-xs leading-5 text-gray-500">Uma futura implementação deverá criar senha temporária segura e registrar a ação na auditoria.</p>
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
  tools = []
}: ScreenProps & { section: "analyses" | "reports" | "assistant" | "integrations" | "backup" | "users" }) {
  if (section === "analyses") return <AnalysesScreen analyses={analyses} cases={cases} caseCount={caseCount} toolCount={toolCount} />;
  if (section === "reports") return <ReportsScreen cases={cases} />;
  if (section === "assistant") return <AssistantScreen />;
  if (section === "integrations") return <IntegrationsScreen tools={tools} />;
  if (section === "backup") return <BackupScreen />;
  return <UsersScreen users={users} />;
}
