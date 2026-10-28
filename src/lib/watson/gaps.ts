// Detecção de lacunas: regras determinísticas sobre os registros. Cada lacuna descreve o que foi
// OBSERVADO nos dados e cita as fontes. O Watson nunca preenche o valor que falta.
import type { CaseData } from "../case-types";
import type { Gap, Severity } from "./types";
import { ref } from "./refs";
import { isValidImei, normalizeHash } from "../hashes";
import { toDate, normalize } from "../text";
import { extractFromNotes, NOTE_TYPE_KEYWORDS, KNOWN_TOOLS } from "./notes";

const ORDER: Record<Severity, number> = { alta: 0, media: 1, baixa: 2, info: 3 };
const fmt = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

export function detectGaps(data: CaseData, now: Date = new Date()): Gap[] {
  const gaps: Gap[] = [];
  const cid = data.id;
  const add = (g: Omit<Gap, "id"> & { entity: string }) => {
    const { entity, ...rest } = g;
    gaps.push({ id: `${g.code}:${entity}`, ...rest });
  };

  const evById = new Map(data.evidences.map((e) => [e.id, e]));
  const isDigital = (e: CaseData["evidences"][number]) => e.category === "DIGITAL";

  for (const ev of data.evidences) {
    const evRef = ref("Evidência", ev.code, cid);

    // ---- hash ----
    if (isDigital(ev) && ev.hashes.length === 0) {
      add({ code: "GAP_HASH_AUSENTE", entity: ev.id, severity: "alta", title: `Evidência digital sem hash (${ev.code})`,
        detail: `A evidência ${ev.code} (${ev.description}) é digital e não tem nenhum hash registrado.`,
        sources: [evRef], suggestion: "Calcule o hash da evidência (de preferência SHA-256) e registre algoritmo e valor.", task: `Registrar hash da evidência ${ev.code}` });
    } else if (ev.hashes.length > 0 && !ev.hashes.some((h) => h.algorithm === "SHA256")) {
      add({ code: "GAP_HASH_FRACO", entity: ev.id, severity: "baixa", title: `Sem SHA-256 em ${ev.code}`,
        detail: `A evidência ${ev.code} tem hash apenas em ${[...new Set(ev.hashes.map((h) => h.algorithm))].join(", ")}; não há SHA-256 registrado.`,
        sources: [evRef], suggestion: "MD5 e SHA-1 têm colisões conhecidas. Considere registrar também o SHA-256, se o procedimento do órgão permitir.", task: `Registrar SHA-256 da evidência ${ev.code}` });
    }
    const byAlgo = new Map<string, Set<string>>();
    for (const h of ev.hashes) {
      const set = byAlgo.get(h.algorithm) ?? new Set<string>();
      set.add(normalizeHash(h.value));
      byAlgo.set(h.algorithm, set);
    }
    for (const [algo, values] of byAlgo) {
      if (values.size > 1) {
        add({ code: "GAP_HASH_DIVERGENTE", entity: `${ev.id}:${algo}`, severity: "alta", title: `Hashes ${algo} divergentes em ${ev.code}`,
          detail: `A evidência ${ev.code} tem ${values.size} valores diferentes registrados para ${algo}: ${[...values].join(" | ")}.`,
          sources: [evRef], suggestion: "Não apague nenhum valor. Registre a data de cada cálculo, a explicação provável e comunique a divergência.", task: `Esclarecer divergência de hash ${algo} em ${ev.code}` });
      }
    }

    // ---- custódia ----
    if (ev.custodyEvents.length === 0) {
      add({ code: "GAP_CUSTODIA_AUSENTE", entity: ev.id, severity: "alta", title: `Evidência sem cadeia de custódia (${ev.code})`,
        detail: `A evidência ${ev.code} não tem nenhum evento de custódia registrado.`,
        sources: [evRef], suggestion: "Registre ao menos o evento de coleta (quem recebeu, onde e quando).", task: `Registrar cadeia de custódia de ${ev.code}` });
    } else {
      const events = [...ev.custodyEvents].sort((a, b) => (toDate(a.occurredAt)?.getTime() ?? 0) - (toDate(b.occurredAt)?.getTime() ?? 0));
      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1];
        const cur = events[i];
        if (cur.fromCustodian && normalize(cur.fromCustodian) !== normalize(prev.toCustodian)) {
          add({ code: "GAP_CUSTODIA_ELO", entity: cur.id, severity: "alta", title: `Elo da custódia não fecha em ${ev.code}`,
            detail: `Em ${fmt(toDate(prev.occurredAt)!)} o item foi recebido por "${prev.toCustodian}", mas o evento seguinte (${fmt(toDate(cur.occurredAt)!)}) indica entrega por "${cur.fromCustodian}".`,
            sources: [evRef], suggestion: "Explique a diferença com um novo evento ou nota (não altere os registros anteriores).", task: `Explicar elo da custódia de ${ev.code}` });
        }
      }
      const noPlace = events.filter((c) => !c.location);
      if (noPlace.length) {
        add({ code: "GAP_CUSTODIA_DADOS", entity: ev.id, severity: "baixa", title: `Custódia sem local em ${ev.code}`,
          detail: `${noPlace.length} de ${events.length} evento(s) de custódia de ${ev.code} não informam o local.`,
          sources: [evRef], suggestion: "Complete o local, se houver documento que o comprove." });
      }
    }

    // ---- coleta ----
    const missing: string[] = [];
    if (!ev.collectedAt) missing.push("data da coleta");
    if (!ev.collectionPlace) missing.push("local da coleta");
    if (!ev.collectedById && !ev.origin) missing.push("origem ou responsável pela coleta");
    if (missing.length) {
      add({ code: "GAP_COLETA_INCOMPLETA", entity: ev.id, severity: "media", title: `Dados de coleta incompletos (${ev.code})`,
        detail: `A evidência ${ev.code} não informa: ${missing.join(", ")}.`,
        sources: [evRef], suggestion: "Complete com base no auto de apreensão/termo de coleta.", task: `Completar dados de coleta de ${ev.code}` });
    }

    // ---- análise ----
    if (!data.analyses.some((a) => a.evidenceId === ev.id)) {
      add({ code: "GAP_EVIDENCIA_SEM_ANALISE", entity: ev.id, severity: "baixa", title: `Evidência sem análise registrada (${ev.code})`,
        detail: `Nenhuma análise está vinculada à evidência ${ev.code}.`, sources: [evRef],
        suggestion: "Registre a análise feita (ou a justificativa de não ter sido analisada)." });
    }

    // ---- coerência temporal ----
    const collected = toDate(ev.collectedAt);
    if (collected) {
      for (const a of data.analyses.filter((x) => x.evidenceId === ev.id)) {
        const at = toDate(a.performedAt);
        if (at && at.getTime() < collected.getTime()) {
          add({ code: "GAP_ANALISE_ANTES_COLETA", entity: a.id, severity: "alta", title: `Análise anterior à coleta (${a.code})`,
            detail: `${a.code} consta como realizada em ${fmt(at)}, antes da coleta de ${ev.code} (${fmt(collected)}).`,
            sources: [ref("Análise", a.code, cid), evRef], suggestion: "Confira as datas; pode ser erro de digitação ou de fuso horário.", task: `Conferir datas de ${a.code} e ${ev.code}` });
        }
      }
      for (const c of ev.custodyEvents) {
        const at = toDate(c.occurredAt);
        if (at && at.getTime() < collected.getTime() - 60_000) {
          add({ code: "GAP_ANALISE_ANTES_COLETA", entity: `c:${c.id}`, severity: "media", title: `Custódia anterior à coleta (${ev.code})`,
            detail: `Evento de custódia "${c.action}" em ${fmt(at)} é anterior à coleta registrada (${fmt(collected)}).`,
            sources: [evRef], suggestion: "Confira as datas registradas." });
        }
      }
    }
  }

  // ---- análises ----
  for (const a of data.analyses) {
    const aRef = ref("Análise", a.code, cid);
    if (!a.toolId) {
      add({ code: "GAP_ANALISE_SEM_FERRAMENTA", entity: a.id, severity: "media", title: `Análise sem ferramenta (${a.code})`,
        detail: `${a.code} (${a.type}) não informa a ferramenta usada.`, sources: [aRef],
        suggestion: "Informe ferramenta e versão para permitir reprodução.", task: `Informar ferramenta da análise ${a.code}` });
    }
    if (!a.conclusion || !a.result) {
      add({ code: "GAP_ANALISE_SEM_CONCLUSAO", entity: a.id, severity: a.result ? "baixa" : "media",
        title: `Análise sem ${!a.result ? "resultado" : "conclusão"} (${a.code})`,
        detail: `${a.code} (${a.type}) não tem ${[!a.result && "resultado", !a.conclusion && "conclusão"].filter(Boolean).join(" nem ")} registrado(a).`,
        sources: [aRef], suggestion: "Registre o que foi observado; deixe a conclusão em branco se ainda não houver.", task: `Completar ${a.code}` });
    }
  }

  // ---- achados ----
  for (const f of data.findings) {
    if (!f.evidenceId && !f.analysisId) {
      add({ code: "GAP_ACHADO_SEM_EVIDENCIA", entity: f.id, severity: "media", title: `Achado sem origem (${f.code})`,
        detail: `O achado ${f.code} ("${f.title}") não está vinculado a nenhuma evidência ou análise; a origem não pode ser rastreada.`,
        sources: [ref("Achado", f.code, cid)], suggestion: "Vincule o achado à evidência e à análise de onde saiu.", task: `Vincular origem do achado ${f.code}` });
    }
  }

  // ---- dispositivos e pessoas ----
  for (const d of data.devices) {
    const dRef = ref("Dispositivo", d.code, cid);
    if (d.type === "SMARTPHONE" && !d.imei) {
      add({ code: "GAP_DISPOSITIVO_SEM_ID", entity: d.id, severity: "media", title: `Smartphone sem IMEI (${d.code})`,
        detail: `O dispositivo ${d.code} é um smartphone e não tem IMEI registrado.`, sources: [dRef],
        suggestion: "Registre o IMEI (15 dígitos). Aparelhos com dois chips podem ter dois.", task: `Registrar IMEI do dispositivo ${d.code}` });
    } else if (d.type !== "SMARTPHONE" && !d.serialNumber && !d.imei && !d.macAddress) {
      add({ code: "GAP_DISPOSITIVO_SEM_ID", entity: d.id, severity: "baixa", title: `Dispositivo sem identificador (${d.code})`,
        detail: `O dispositivo ${d.code} não tem número de série, IMEI nem MAC registrado.`, sources: [dRef] });
    }
    if (d.imei && !isValidImei(d.imei)) {
      add({ code: "GAP_IMEI_INVALIDO", entity: d.id, severity: "media", title: `IMEI não passa na conferência (${d.code})`,
        detail: `O IMEI "${d.imei}" do dispositivo ${d.code} não tem 15 dígitos válidos ou falha no dígito verificador (Luhn).`,
        sources: [dRef], suggestion: "Compare com a etiqueta/tela do aparelho; pode ser erro de digitação.", task: `Conferir IMEI do dispositivo ${d.code}` });
    }
    if (!d.personId) {
      add({ code: "GAP_DISPOSITIVO_SEM_PESSOA", entity: d.id, severity: "baixa", title: `Dispositivo sem pessoa associada (${d.code})`,
        detail: `O dispositivo ${d.code} não está associado a nenhuma pessoa.`, sources: [dRef] });
    }
  }

  // ---- visão geral do caso ----
  const entityCount = data.people.length + data.devices.length + data.evidences.length + data.findings.length;
  if (entityCount >= 3 && data.relationships.length === 0) {
    add({ code: "GAP_SEM_RELACIONAMENTOS", entity: data.id, severity: "baixa", title: "Nenhum relacionamento cadastrado",
      detail: `O caso tem ${entityCount} entidades (pessoas, dispositivos, evidências, achados) e nenhuma conexão no mapa de relacionamentos.`,
      sources: [ref("Caso", data.code, cid)], suggestion: "Conecte as entidades no Mapa de Relacionamentos." });
  }
  if (data.events.length === 0 && data.evidences.length > 0) {
    add({ code: "GAP_SEM_LINHA_TEMPO", entity: data.id, severity: "baixa", title: "Linha do tempo sem eventos manuais",
      detail: "Não há eventos manuais; a linha do tempo mostra apenas custódia.", sources: [ref("Caso", data.code, cid)],
      suggestion: "Registre os marcos do caso (apreensão, coleta, laudo solicitado etc.)." });
  }
  if (!data.description || data.description.trim().length < 10) {
    add({ code: "GAP_CASO_SEM_DESCRICAO", entity: data.id, severity: "baixa", title: "Caso sem descrição",
      detail: "O caso não tem descrição (ou ela é muito curta).", sources: [ref("Caso", data.code, cid)] });
  }

  const pending = data.tasks.filter((t) => t.status !== "CONCLUIDA");
  for (const t of pending) {
    const due = toDate(t.dueDate);
    if (due && due.getTime() < now.getTime()) {
      add({ code: "GAP_TAREFA_VENCIDA", entity: t.id, severity: "media", title: `Tarefa vencida: ${t.title}`,
        detail: `A tarefa "${t.title}" venceu em ${due.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} e continua ${t.status === "PENDENTE" ? "pendente" : "em andamento"}.`,
        sources: [ref("Tarefa", t.title.slice(0, 30), cid)] });
    }
  }

  // ---- duplicidade de hash dentro do caso ----
  const seen = new Map<string, string[]>();
  for (const ev of data.evidences) for (const h of ev.hashes) {
    const key = `${h.algorithm}:${normalizeHash(h.value)}`;
    const list = seen.get(key) ?? [];
    if (!list.includes(ev.code)) list.push(ev.code);
    seen.set(key, list);
  }
  for (const [key, codes] of seen) {
    if (codes.length > 1) {
      add({ code: "GAP_EVIDENCIA_DUPLICADA_HASH", entity: key, severity: "media", title: `Mesmo hash em ${codes.join(" e ")}`,
        detail: `As evidências ${codes.join(", ")} têm o mesmo ${key.split(":")[0]}. Conteúdo idêntico não explica, por si, o contexto (pode ser cópia da mesma mídia ou erro de cadastro).`,
        sources: codes.map((c) => ref("Evidência", c, cid)), suggestion: "Confirme se são itens distintos; se for o mesmo item, evite duplicar o cadastro." });
    }
  }

  // ---- diário do perito x registros ----
  const noteInfo = extractFromNotes(data);
  for (const m of noteInfo.unregistered) {
    add({ code: "GAP_NOTA_DADO_NAO_CADASTRADO", entity: `${m.kind}:${m.value}`, severity: "media",
      title: `${m.label} citado nas notas e não cadastrado`,
      detail: `O diário menciona ${m.label.toLowerCase()} "${m.value}" (nota de ${fmt(toDate(m.noteAt)!)}), mas esse valor não existe nos registros do caso.`,
      sources: [ref("Nota", fmt(toDate(m.noteAt)!), cid)], suggestion: "Cadastre o dado no local apropriado ou corrija a nota se houver erro de digitação.", task: `Conferir ${m.label.toLowerCase()} citado nas notas: ${m.value}` });
  }
  for (const m of noteInfo.missingTypes) {
    add({ code: "GAP_NOTA_TIPO_NAO_CADASTRADO", entity: m.type, severity: "baixa", title: `Notas citam ${m.keyword}, sem item cadastrado`,
      detail: `O diário menciona "${m.keyword}", mas não há evidência nem dispositivo do tipo ${m.type} no caso.`,
      sources: [ref("Nota", fmt(toDate(m.noteAt)!), cid)], suggestion: "Se o item existe, cadastre-o como evidência ou dispositivo." });
  }
  for (const m of noteInfo.toolsWithoutAnalysis) {
    add({ code: "GAP_NOTA_FERRAMENTA_SEM_ANALISE", entity: m.tool, severity: "baixa", title: `Notas citam ${m.tool}, sem análise correspondente`,
      detail: `O diário menciona a ferramenta "${m.tool}", mas nenhuma análise registrada usa uma ferramenta com esse nome.`,
      sources: [ref("Nota", fmt(toDate(m.noteAt)!), cid)], suggestion: "Registre a análise correspondente (ou ajuste o nome da ferramenta cadastrada)." });
  }

  // ---- caso encerrado/em laudo com pendências ----
  if (["CONCLUIDO", "ARQUIVADO", "EM_ELABORACAO_LAUDO"].includes(data.status)) {
    const high = gaps.filter((g) => g.severity === "alta").length;
    if (pending.length || high) {
      add({ code: "GAP_CASO_ENCERRADO_PENDENCIAS", entity: data.id, severity: "alta", title: "Caso em fase final com pendências",
        detail: `O caso está "${data.status}" e ainda tem ${pending.length} tarefa(s) pendente(s) e ${high} lacuna(s) de severidade alta.`,
        sources: [ref("Caso", data.code, cid)], suggestion: "Resolva ou justifique as pendências antes de emitir o laudo." });
    }
  }

  void evById; void NOTE_TYPE_KEYWORDS; void KNOWN_TOOLS;
  return gaps.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || a.title.localeCompare(b.title, "pt-BR"));
}
