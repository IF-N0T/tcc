// Análise do Diário do perito: extrai identificadores e compara com os registros do caso.
// Só acusa o que está nas notas e não nos registros; não inventa nem completa dados.
import type { CaseData } from "../case-types";
import { normalize } from "../text";
import { normalizeDigits, normalizeHash } from "../hashes";

export const NOTE_TYPE_KEYWORDS: { type: string; keyword: string; re: RegExp }[] = [
  { type: "PENDRIVE", keyword: "pendrive", re: /\b(pen ?drive|pen-drive|flash drive)\b/ },
  { type: "CARTAO_MEMORIA", keyword: "cartão de memória", re: /\b(cartao de memoria|sd card|micro ?sd)\b/ },
  { type: "NOTEBOOK", keyword: "notebook", re: /\b(notebook|laptop)\b/ },
  { type: "COMPUTADOR", keyword: "computador", re: /\b(computador|desktop)\b/ },
  { type: "SMARTPHONE", keyword: "celular/smartphone", re: /\b(celular|smartphone|telefone celular|iphone)\b/ },
  { type: "SSD", keyword: "SSD", re: /\bssd\b/ },
  { type: "HD", keyword: "HD", re: /\b(hd externo|hd|disco rigido)\b/ }
];

export const KNOWN_TOOLS = ["Autopsy", "FTK Imager", "FTK", "ImageJ", "Fiji", "Cellebrite", "UFED", "Magnet AXIOM", "AXIOM", "Oxygen", "EnCase", "X-Ways", "Volatility", "ExifTool", "Wireshark", "Sleuth Kit"];

type Unregistered = { kind: string; label: string; value: string; noteAt: Date | string };

export function extractFromNotes(data: CaseData) {
  const unregistered: Unregistered[] = [];
  const missingTypes: { type: string; keyword: string; noteAt: Date | string }[] = [];
  const toolsWithoutAnalysis: { tool: string; noteAt: Date | string }[] = [];

  const registeredHashes = new Set(data.evidences.flatMap((e) => e.hashes.map((h) => normalizeHash(h.value))));
  const registeredImeis = new Set(data.devices.map((d) => normalizeDigits(d.imei)).filter(Boolean));
  const registeredEmails = new Set([...data.people.map((p) => normalize(p.email)), ...data.people.map((p) => normalize(p.notes))].filter(Boolean));
  const registeredPhones = new Set(data.people.map((p) => normalizeDigits(p.phone)).filter((v) => v.length >= 8));
  const registeredDocs = new Set(data.people.map((p) => normalizeDigits(p.document)).filter((v) => v.length >= 8));
  const registeredCodes = new Set([
    data.code, ...data.evidences.map((e) => e.code), ...data.devices.map((d) => d.code), ...data.people.map((p) => p.code),
    ...data.analyses.map((a) => a.code), ...data.findings.map((f) => f.code)
  ].map((c) => c.toUpperCase()));
  const types = new Set([...data.evidences.map((e) => e.type), ...data.devices.map((d) => d.type)]);
  const toolNames = data.analyses.map((a) => normalize(a.tool?.name)).filter(Boolean);
  const importTools = data.imports.map((i) => normalize(i.tool?.name)).filter(Boolean);

  const seen = new Set<string>();
  const push = (kind: string, label: string, value: string, noteAt: Date | string) => {
    const key = `${kind}:${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    unregistered.push({ kind, label, value, noteAt });
  };

  for (const note of data.caseNotes) {
    const text = note.text;
    const norm = normalize(text);

    for (const m of text.matchAll(/\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b/g)) {
      const v = normalizeHash(m[0]);
      if (!registeredHashes.has(v)) push("hash", "Hash", v, note.createdAt);
    }
    for (const m of text.matchAll(/(?<![\d.])\d{15}(?![\d])/g)) {
      if (!registeredImeis.has(m[0])) push("imei", "IMEI", m[0], note.createdAt);
    }
    for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
      const v = normalize(m[0]);
      const known = registeredEmails.has(v) || [...registeredEmails].some((e) => e.includes(v)) || normalize(data.responsible.email) === v;
      if (!known) push("email", "E-mail", m[0], note.createdAt);
    }
    for (const m of text.matchAll(/\(?\b\d{2}\)?\s?9?\d{4}-?\d{4}\b/g)) {
      const d = normalizeDigits(m[0]);
      if (d.length >= 10 && !registeredPhones.has(d) && ![...registeredPhones].some((p) => p.endsWith(d.slice(-9)))) push("telefone", "Telefone", m[0].trim(), note.createdAt);
    }
    for (const m of text.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)) {
      if (!registeredDocs.has(normalizeDigits(m[0]))) push("documento", "CPF", m[0], note.createdAt);
    }
    for (const m of text.matchAll(/\b(CAS|EVD|DEV|PES|ANA|ACH)-\d{4}-\d{4}\b/g)) {
      if (!registeredCodes.has(m[0].toUpperCase())) push("codigo", "Código", m[0], note.createdAt);
    }

    for (const t of NOTE_TYPE_KEYWORDS) {
      if (t.re.test(norm) && !types.has(t.type) && !missingTypes.some((x) => x.type === t.type)) {
        // "HD" e "computador" são palavras genéricas; só acusa se não há nenhuma mídia/computador similar.
        const family = t.type === "HD" ? ["HD", "SSD"] : t.type === "COMPUTADOR" ? ["COMPUTADOR", "NOTEBOOK"] : [t.type];
        if (!family.some((f) => types.has(f))) missingTypes.push({ type: t.type, keyword: t.keyword, noteAt: note.createdAt });
      }
    }
    for (const tool of KNOWN_TOOLS) {
      const n = normalize(tool);
      if (new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(norm)) {
        const used = [...toolNames, ...importTools].some((t) => t.includes(n) || n.includes(t));
        if (!used && !toolsWithoutAnalysis.some((x) => normalize(x.tool) === n)) toolsWithoutAnalysis.push({ tool, noteAt: note.createdAt });
      }
    }
  }
  return { unregistered, missingTypes, toolsWithoutAnalysis };
}
