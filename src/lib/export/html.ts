// Relatório HTML autônomo (um único arquivo): colorido ou preto e branco, com versão de impressão
// em A4, índice, seções recolhíveis, filtro e botões. Todo o conteúdo vem dos registros do caso.
import type { CaseData } from "../case-types";
import type { Gap } from "../watson/types";
import { escapeHtml as h, fmtDateTime, fmtDate, toDate } from "../text";
import { buildTables, summaryPairs, type ExportMeta, type Table, type Cell } from "./tables";
import { STATUS_LABEL, PRIORITY_LABEL, EVIDENCE_TYPE_LABEL, CATEGORY_LABEL, ALGORITHM_LABEL, SEVERITY_LABEL, TASK_STATUS_LABEL } from "../labels";
import { draftLaudo } from "../watson/draft";

export type HtmlOptions = { mode: "color" | "bw"; autoPrint?: boolean };

const CSS = `
:root{--ink:#1b1d22;--muted:#5b6270;--line:#d8dce3;--soft:#f3f4f7;--accent:#7a5a1c;--accent-soft:#f7f0df;--cover:#1f2430;--cover-ink:#fff;
--high:#b42318;--high-bg:#fdecea;--med:#9a5b06;--med-bg:#fff3d9;--low:#475467;--low-bg:#eceff3;--ok:#18794e;--ok-bg:#e4f4ec;--fill:#fff3b0}
[data-mode=bw]{--ink:#000;--muted:#333;--line:#8a8a8a;--soft:#efefef;--accent:#000;--accent-soft:#fff;--cover:#000;--cover-ink:#fff;
--high:#000;--high-bg:#fff;--med:#000;--med-bg:#fff;--low:#000;--low-bg:#fff;--ok:#000;--ok-bg:#fff;--fill:#fff}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;background:#e9ebef;color:var(--ink);font:14px/1.55 "Segoe UI",system-ui,-apple-system,Arial,sans-serif}
[data-mode=bw] body{background:#d6d6d6}
.toolbar{position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px 16px;background:#fff;border-bottom:1px solid var(--line)}
.toolbar b{margin-right:auto;font-size:13px}
.toolbar button,.toolbar input{font:inherit;font-size:13px;border:1px solid #b9bfca;background:#fff;border-radius:6px;padding:6px 10px;color:#1b1d22}
.toolbar button{cursor:pointer}.toolbar button:hover{background:#f1f3f6}.toolbar button[aria-pressed=true]{background:#1f2430;color:#fff;border-color:#1f2430}
.doc{max-width:920px;margin:20px auto 60px;background:#fff;padding:36px 44px 50px;box-shadow:0 2px 14px rgba(0,0,0,.12)}
.cover{background:var(--cover);color:var(--cover-ink);margin:-36px -44px 24px;padding:28px 44px 22px}
.cover small{display:block;letter-spacing:.04em;opacity:.8;font-size:12px}
.cover h1{font:600 26px/1.2 Georgia,"Times New Roman",serif;margin:6px 0 4px}
.cover .code{font:12px Consolas,monospace;opacity:.9}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 4px}
.chip{border:1px solid var(--line);border-radius:6px;padding:6px 12px;min-width:92px}.chip b{display:block;font-size:20px;line-height:1.1}.chip span{font-size:11px;color:var(--muted)}
nav.toc{border:1px solid var(--line);border-left:4px solid var(--accent);padding:10px 16px;margin:18px 0 8px;background:var(--soft)}
nav.toc ol{margin:6px 0 0;padding-left:20px;columns:2;font-size:13px}nav.toc a{color:var(--ink);text-decoration:none}nav.toc a:hover,nav.toc a.on{text-decoration:underline;font-weight:600}
.doc{counter-reset:sec}section.sec{counter-increment:sec;margin-top:30px;counter-reset:sub}
section.sec>h2{font:600 19px/1.3 Georgia,"Times New Roman",serif;border-bottom:2px solid var(--ink);padding-bottom:4px;margin:0 0 12px;color:var(--ink)}
section.sec>h2::before{content:counter(sec) ". ";color:var(--accent)}
h3{font-size:14px;margin:16px 0 6px;padding-left:10px;border-left:3px solid var(--accent)}
.hint{color:var(--muted);font-size:12.5px;margin:2px 0 10px}
dl.kv{display:grid;grid-template-columns:190px 1fr;margin:0;border-top:1px solid var(--line)}
dl.kv dt,dl.kv dd{margin:0;padding:5px 8px;border-bottom:1px solid var(--line)}dl.kv dt{background:var(--soft);font-weight:600;font-size:12.5px}
details.item{border:1px solid var(--line);border-left:4px solid var(--accent);margin:0 0 12px;padding:0 14px 6px}
details.item>summary{cursor:pointer;padding:9px 0;font-weight:600;list-style:none;display:flex;gap:8px;flex-wrap:wrap;align-items:baseline}
details.item>summary::-webkit-details-marker{display:none}
details.item>summary::before{content:"▸";color:var(--accent)}details.item[open]>summary::before{content:"▾"}
.item .inner{margin-left:12px;padding-left:12px;border-left:1px dotted var(--line)}
.code{font:12px Consolas,"Cascadia Mono",monospace;background:var(--soft);border:1px solid var(--line);padding:0 6px;border-radius:3px}
.mono{font:11.5px Consolas,"Cascadia Mono",monospace;word-break:break-all}.mono[data-copy]{cursor:copy}
table.grid{width:100%;border-collapse:collapse;font-size:12.5px;margin:6px 0 12px}
table.grid th{background:var(--soft);text-align:left;border-bottom:2px solid var(--ink);padding:5px 7px;font-size:12px}
table.grid td{border-bottom:1px solid var(--line);padding:5px 7px;vertical-align:top}
table.grid tr{break-inside:avoid}table.grid thead{display:table-header-group}
.badge{display:inline-block;border:1px solid currentColor;border-radius:999px;padding:0 8px;font-size:11.5px;font-weight:600;white-space:nowrap}
.sev-alta{color:var(--high);background:var(--high-bg)}.sev-media{color:var(--med);background:var(--med-bg)}.sev-baixa{color:var(--low);background:var(--low-bg)}.sev-ok{color:var(--ok);background:var(--ok-bg)}
[data-mode=bw] .sev-alta{border:2px solid #000;font-weight:800}[data-mode=bw] .sev-media{border:1.5px solid #000}[data-mode=bw] .sev-baixa{border:1px dashed #000;font-weight:500}
.fill{background:var(--fill);border-bottom:1px dotted var(--ink);padding:0 2px}
.pre{white-space:pre-wrap;margin:2px 0}
.sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:46px}.sign div{border-top:1px solid var(--ink);padding-top:6px;font-size:12.5px;text-align:center}
.integrity{font-size:12px;color:var(--muted);border:1px dashed var(--line);padding:8px 12px;margin-top:22px}
.run-footer{display:none}.empty{color:var(--muted);font-style:italic}
mark.hit{background:#ffe58a}[data-mode=bw] mark.hit{background:#ddd}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#1f2430;color:#fff;padding:6px 14px;border-radius:6px;font-size:13px}
@page{size:A4;margin:16mm 14mm 18mm}
@media print{
 body{background:#fff;font-size:11.5px}.no-print,.toolbar,.toast{display:none!important}
 .doc{max-width:none;margin:0;padding:0 0 12mm;box-shadow:none}.cover{margin:0 0 14px;padding:16px 18px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
 *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
 section.sec{margin-top:18px}section.sec>h2,h3{break-after:avoid}details.item{break-inside:avoid-page}
 nav.toc{break-after:page}nav.toc ol{columns:2}
 .run-footer{display:flex;justify-content:space-between;position:fixed;bottom:0;left:0;right:0;font-size:9.5px;color:#444;border-top:1px solid #999;padding-top:3px;background:#fff}
 a{color:inherit;text-decoration:none}
}
@media(max-width:640px){.doc{padding:18px}.cover{margin:-18px -18px 18px;padding:18px}dl.kv{grid-template-columns:1fr}nav.toc ol{columns:1}}
`;

const JS = `
(function(){
var d=document,root=d.documentElement;
function $(s,c){return Array.prototype.slice.call((c||d).querySelectorAll(s))}
var modeBtns=$('[data-mode-btn]');
function setMode(m){root.setAttribute('data-mode',m);modeBtns.forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-mode-btn')===m))})}
modeBtns.forEach(function(b){b.addEventListener('click',function(){setMode(b.getAttribute('data-mode-btn'))})});setMode(root.getAttribute('data-mode')||'color');
var open=true;var tg=d.getElementById('toggle-all');
if(tg)tg.addEventListener('click',function(){open=!open;$('details.item').forEach(function(x){x.open=open});tg.textContent=open?'Recolher tudo':'Expandir tudo'});
var pr=d.getElementById('print-btn');if(pr)pr.addEventListener('click',function(){window.print()});
var saved=[];window.addEventListener('beforeprint',function(){saved=$('details.item').map(function(x){return x.open});$('details.item').forEach(function(x){x.open=true})});
window.addEventListener('afterprint',function(){$('details.item').forEach(function(x,i){x.open=saved[i]!==false})});
var q=d.getElementById('filter');
if(q)q.addEventListener('input',function(){var t=q.value.trim().toLowerCase();
 $('mark.hit').forEach(function(m){m.replaceWith(d.createTextNode(m.textContent))});
 $('table.grid tbody tr').forEach(function(r){r.style.display=!t||r.textContent.toLowerCase().indexOf(t)>-1?'':'none'});
 $('details.item').forEach(function(x){var ok=!t||x.textContent.toLowerCase().indexOf(t)>-1;x.style.display=ok?'':'none';if(t&&ok)x.open=true})});
$('[data-copy]').forEach(function(e){e.title='Clique para copiar';e.addEventListener('click',function(){
 if(navigator.clipboard)navigator.clipboard.writeText(e.getAttribute('data-copy')).then(function(){toast('Copiado')})})});
function toast(t){var n=d.createElement('div');n.className='toast no-print';n.textContent=t;d.body.appendChild(n);setTimeout(function(){n.remove()},1400)}
var links=$('nav.toc a');
if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id)})}})},{rootMargin:'-20% 0px -70% 0px'});$('section.sec').forEach(function(s){io.observe(s)})}
if(location.search.indexOf('print=1')>-1||${'${AUTOPRINT}'})setTimeout(function(){window.print()},400);
})();
`;

const sevClass = (s: string) => (s.toLowerCase().startsWith("alta") ? "sev-alta" : s.toLowerCase().startsWith("m") ? "sev-media" : "sev-baixa");
const val = (c: Cell) => (c instanceof Date ? fmtDateTime(c) : c === null || c === "" ? "" : String(c));

function renderTable(t: Table): string {
  if (!t.rows.length) return `<p class="empty">Nenhum registro.</p>`;
  const head = t.headers.map((x) => `<th>${h(x)}</th>`).join("");
  const body = t.rows.map((r) => `<tr>${r.map((c, i) => {
    const text = val(c);
    if (t.severityCol === i) return `<td><span class="badge ${sevClass(text)}">${h(text)}</span></td>`;
    if (t.mono?.includes(i)) return `<td class="mono" data-copy="${h(text)}">${h(text)}</td>`;
    return `<td>${h(text).replace(/\n/g, "<br>")}</td>`;
  }).join("")}</tr>`).join("");
  return `<table class="grid"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

const kv = (pairs: [string, string][]) =>
  `<dl class="kv">${pairs.filter(([, v]) => v).map(([k, v]) => `<dt>${h(k)}</dt><dd>${h(v).replace(/\n/g, "<br>")}</dd>`).join("")}</dl>`;

function fillify(text: string): string {
  return h(text).replace(/\[PREENCHER:[^\]]*\]/g, (m) => `<span class="fill">${m}</span>`);
}

export function caseToHtml(data: CaseData, gaps: Gap[], meta: ExportMeta, fingerprint: string, opts: HtmlOptions): string {
  const tables = buildTables(data, gaps, meta);
  const tab = (key: string) => tables.find((t) => t.key === key)!;
  const user = (id: string | null) => (id ? data.userNames[id] ?? "" : "");
  const sections: { id: string; title: string; html: string }[] = [];

  const stats = [
    ["Pessoas", data.people.length], ["Dispositivos", data.devices.length], ["Evidências", data.evidences.length],
    ["Análises", data.analyses.length], ["Achados", data.findings.length], ["Lacunas", gaps.length]
  ];
  sections.push({ id: "identificacao", title: "Identificação do caso", html:
    kv([
      ["Código", data.code], ["Nome", data.name], ["Descrição", data.description ?? ""],
      ["Situação", STATUS_LABEL[data.status] ?? data.status], ["Prioridade", PRIORITY_LABEL[data.priority] ?? data.priority],
      ["Perito responsável", `${data.responsible.name} (${data.responsible.email})`],
      ["Aberto em", fmtDate(data.openedAt)], ["Encerrado em", data.closedAt ? fmtDate(data.closedAt) : ""]
    ]) + `<div class="chips">${stats.map(([k, v]) => `<div class="chip"><b>${v}</b><span>${k}</span></div>`).join("")}</div>` });

  if (meta.doc === "laudo") {
    const text = draftLaudo(data, gaps);
    sections.push({ id: "minuta", title: "Minuta de laudo", html:
      `<p class="hint">Organizada pelo Watson só com os dados registrados. Os campos destacados precisam ser preenchidos pelo perito.</p>` +
      text.split("\n").slice(3).map((l) => l.trim() === "" ? "" : /^\d+\. [A-ZÇÃÕ ]+$/.test(l) ? `<h3>${h(l)}</h3>` : `<p class="pre">${fillify(l)}</p>`).join("") });
  } else {
    const peopleTab = tab("pessoas"), devTab = tab("dispositivos");
    sections.push({ id: "pessoas", title: "Pessoas e dispositivos", html: `<h3>Pessoas</h3>${renderTable(peopleTab)}<h3>Dispositivos</h3>${renderTable(devTab)}` });

    const evHtml = data.evidences.map((e) => {
      const hashes = e.hashes.length ? `<table class="grid"><thead><tr><th>Algoritmo</th><th>Valor</th><th>Calculado em</th><th>Por</th></tr></thead><tbody>${e.hashes.map((x) => `<tr><td>${h(ALGORITHM_LABEL[x.algorithm] ?? x.algorithm)}</td><td class="mono" data-copy="${h(x.value)}">${h(x.value)}</td><td>${h(fmtDateTime(x.calculatedAt))}</td><td>${h(user(x.calculatedById))}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">${e.category === "FISICA" ? "Evidência física: hash não se aplica." : "Nenhum hash registrado."}</p>`;
      const cust = e.custodyEvents.length ? `<table class="grid"><thead><tr><th>Data/hora</th><th>Ação</th><th>De</th><th>Para</th><th>Local</th><th>Motivo</th></tr></thead><tbody>${e.custodyEvents.map((c) => `<tr><td>${h(fmtDateTime(c.occurredAt))}</td><td>${h(c.action)}</td><td>${h(c.fromCustodian ?? "—")}</td><td>${h(c.toCustodian)}</td><td>${h(c.location ?? "—")}</td><td>${h(c.reason ?? "—")}</td></tr>`).join("")}</tbody></table>` : `<p class="empty">Nenhum evento de custódia registrado.</p>`;
      const dv = data.devices.find((d) => d.id === e.deviceId);
      return `<details class="item" open><summary><span class="code">${h(e.code)}</span> ${h(e.description)} <span class="badge sev-baixa">${h(CATEGORY_LABEL[e.category] ?? e.category)} · ${h(EVIDENCE_TYPE_LABEL[e.type] ?? e.type)}</span></summary><div class="inner">${kv([
        ["Dispositivo", dv ? `${dv.code} — ${[dv.brand, dv.model].filter(Boolean).join(" ")}` : ""], ["Origem", e.origin ?? ""],
        ["Coletada em", e.collectedAt ? fmtDateTime(e.collectedAt) : ""], ["Local da coleta", e.collectionPlace ?? ""], ["Coletada por", user(e.collectedById)],
        ["Estado", e.state ?? ""], ["Tamanho / formato", [e.size, e.format].filter(Boolean).join(" · ")], ["Observações", e.notes ?? ""]
      ])}<h3>Integridade (hashes)</h3>${hashes}<h3>Cadeia de custódia</h3>${cust}</div></details>`;
    }).join("");
    sections.push({ id: "evidencias", title: "Evidências, integridade e custódia", html: evHtml || `<p class="empty">Nenhuma evidência cadastrada.</p>` });

    const anHtml = data.analyses.map((a) => `<details class="item" open><summary><span class="code">${h(a.code)}</span> ${h(a.type)} <span class="badge sev-baixa">${h(fmtDateTime(a.performedAt))}</span></summary><div class="inner">${kv([
      ["Evidência", data.evidences.find((e) => e.id === a.evidenceId)?.code ?? ""], ["Ferramenta", a.tool ? `${a.tool.name}${a.tool.version ? " " + a.tool.version : ""}` : ""],
      ["Responsável", a.performedBy.name], ["Procedimento", a.procedure ?? ""], ["Resultado", a.result ?? ""], ["Conclusão", a.conclusion ?? ""]
    ])}</div></details>`).join("");
    sections.push({ id: "analises", title: "Análises realizadas", html: anHtml || `<p class="empty">Nenhuma análise registrada.</p>` });
    sections.push({ id: "achados", title: "Achados", html: renderTable(tab("achados")) });
    sections.push({ id: "tempo", title: "Linha do tempo", html: `<p class="hint">Montada a partir de datas registradas. Itens sem data não aparecem.</p>${renderTable(tab("linha-do-tempo"))}` });
    sections.push({ id: "relacionamentos", title: "Relacionamentos", html: renderTable(tab("relacionamentos")) });
    sections.push({ id: "tarefas", title: "Tarefas", html: renderTable(tab("tarefas")) });
    sections.push({ id: "diario", title: "Diário do perito", html: renderTable(tab("diario")) });
    sections.push({ id: "importacoes", title: "Importações de ferramentas", html: renderTable(tab("importacoes")) });
    sections.push({ id: "lacunas", title: "Lacunas e pendências (Watson)", html:
      `<p class="hint">Regras determinísticas aplicadas aos registros. Cada linha descreve o que foi observado; a sugestão é uma orientação, não um fato.</p>${renderTable(tab("lacunas"))}` });
  }

  const toc = sections.map((s) => `<li><a href="#${s.id}">${h(s.title)}</a></li>`).join("");
  const title = `${data.code} — ${data.name}`;
  const docLabel = meta.doc === "laudo" ? "Minuta de laudo pericial" : "Relatório de perícia digital";

  return `<!doctype html>
<html lang="pt-BR" data-mode="${opts.mode}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title)}</title><style>${CSS}</style></head>
<body>
<div class="toolbar no-print">
  <b>${h(data.code)}</b>
  <button type="button" data-mode-btn="color" aria-pressed="${opts.mode === "color"}">Colorido</button>
  <button type="button" data-mode-btn="bw" aria-pressed="${opts.mode === "bw"}">Preto e branco</button>
  <button type="button" id="toggle-all">Recolher tudo</button>
  <input id="filter" type="search" placeholder="Filtrar no documento…" aria-label="Filtrar">
  <button type="button" id="print-btn">Imprimir / salvar PDF</button>
</div>
<main class="doc">
  <header class="cover"><small>Sherlock · ${h(docLabel)}</small><h1>${h(data.name)}</h1><span class="code" style="background:transparent;color:inherit;border-color:rgba(255,255,255,.4)">${h(data.code)}</span>
  <small style="margin-top:8px">Emitido em ${h(fmtDateTime(meta.generatedAt))} por ${h(meta.generatedBy)}</small></header>
  <nav class="toc" aria-label="Índice"><strong>Índice</strong><ol>${toc}</ol></nav>
  ${sections.map((s) => `<section class="sec" id="${s.id}"><h2>${h(s.title)}</h2>${s.html}</section>`).join("\n")}
  <section class="sec" id="assinatura"><h2>Responsável e integridade do documento</h2>
    <div class="sign"><div>${h(data.responsible.name)}<br>Perito responsável</div><div>Data: ____ / ____ / ________</div></div>
    <p class="integrity">Impressão digital (SHA-256) do conjunto de dados exportado: <span class="mono" data-copy="${h(fingerprint)}">${h(fingerprint)}</span><br>
    Serve para conferir se os dados exportados foram alterados depois da emissão. Documento gerado pelo Sherlock em ${h(fmtDateTime(meta.generatedAt))}.</p></section>
</main>
<div class="run-footer"><span>${h(data.code)} · ${h(docLabel)}</span><span>Emitido em ${h(fmtDate(meta.generatedAt))}</span></div>
<script>${JS.replace("${AUTOPRINT}", opts.autoPrint ? "true" : "false")}</script>
</body></html>`;
}
void toDate; void SEVERITY_LABEL; void TASK_STATUS_LABEL;
