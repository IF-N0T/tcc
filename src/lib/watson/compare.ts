// Comparação com OUTROS casos: coincidências de hash, pessoas e dispositivos.
// Mostra coincidências de valor; nunca conclui que há relação entre os casos.
import { prisma } from "../prisma";
import type { CaseData } from "../case-types";
import type { Block } from "./types";
import { normalizeDigits, normalizeHash, normalizeMac } from "../hashes";
import { normalize } from "../text";

const chunk = <T,>(arr: T[], n: number) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

export async function compareAcrossCases(data: CaseData): Promise<Block[]> {
  const blocks: Block[] = [];
  const note = "Coincidência de valor não implica, por si, relação entre os casos. Verifique o contexto antes de qualquer conclusão.";

  // 1) hashes de evidência x evidências/itens de outros casos
  const myHashes = [...new Set(data.evidences.flatMap((e) => e.hashes.map((h) => normalizeHash(h.value))))].slice(0, 60);
  const rows: string[][] = [];
  if (myHashes.length) {
    const other = await prisma.evidenceHash.findMany({
      where: { evidence: { caseId: { not: data.id } }, OR: myHashes.map((v) => ({ value: { equals: v, mode: "insensitive" as const } })) },
      include: { evidence: { select: { code: true, description: true, case: { select: { code: true } } } } },
      take: 100
    });
    for (const o of other) {
      const mine = data.evidences.find((e) => e.hashes.some((h) => normalizeHash(h.value) === normalizeHash(o.value)));
      rows.push(["Hash de evidência", o.value, mine?.code ?? "—", `${o.evidence.code} — ${o.evidence.description}`, o.evidence.case.code]);
    }
    const items = await prisma.importedItem.findMany({
      where: { caseId: { not: data.id }, OR: [{ md5: { in: myHashes } }, { sha1: { in: myHashes } }, { sha256: { in: myHashes } }] },
      select: { name: true, md5: true, sha1: true, sha256: true, case: { select: { code: true } } }, take: 100
    });
    for (const it of items) {
      const val = [it.md5, it.sha1, it.sha256].find((v) => v && myHashes.includes(v)) ?? "";
      const mine = data.evidences.find((e) => e.hashes.some((h) => normalizeHash(h.value) === val));
      rows.push(["Hash de evidência × arquivo importado", val, mine?.code ?? "—", it.name, it.case.code]);
    }
  }

  // 2) itens importados deste caso x itens de outros casos / evidências de outros casos
  const mine = await prisma.importedItem.findMany({
    where: { caseId: data.id, OR: [{ md5: { not: null } }, { sha1: { not: null } }, { sha256: { not: null } }] },
    select: { name: true, md5: true, sha1: true, sha256: true }, take: 20000
  });
  if (mine.length) {
    const byHash = new Map<string, string>();
    for (const it of mine) for (const h of [it.md5, it.sha1, it.sha256]) if (h) byHash.set(h, it.name);
    const hashes = [...byHash.keys()];
    let found = 0;
    for (const part of chunk(hashes, 1000)) {
      if (found >= 200) break;
      const other = await prisma.importedItem.findMany({
        where: { caseId: { not: data.id }, OR: [{ md5: { in: part } }, { sha1: { in: part } }, { sha256: { in: part } }] },
        select: { name: true, md5: true, sha1: true, sha256: true, case: { select: { code: true } } }, take: 100
      });
      for (const o of other) {
        const val = [o.md5, o.sha1, o.sha256].find((v) => v && byHash.has(v)) ?? "";
        rows.push(["Arquivo importado", val, byHash.get(val) ?? "—", o.name, o.case.code]);
        found++;
      }
      const evs = await prisma.evidenceHash.findMany({
        where: { evidence: { caseId: { not: data.id } }, value: { in: part } },
        include: { evidence: { select: { code: true, case: { select: { code: true } } } } }, take: 50
      });
      for (const e of evs) rows.push(["Arquivo importado × hash de evidência", e.value, byHash.get(normalizeHash(e.value)) ?? "—", e.evidence.code, e.evidence.case.code]);
    }
  }

  // duplicidades entre importações do próprio caso (mesmo hash em itens com nomes diferentes)
  if (mine.length) {
    const names = new Map<string, Set<string>>();
    for (const it of mine) { const h = it.sha256 ?? it.sha1 ?? it.md5; if (!h) continue; const s = names.get(h) ?? new Set(); s.add(it.name); names.set(h, s); }
    const dup = [...names.entries()].filter(([, s]) => s.size > 1).slice(0, 30);
    if (dup.length) {
      blocks.push({ type: "table", title: "Mesmo conteúdo com nomes diferentes (neste caso)", columns: ["Hash", "Nomes"], rows: dup.map(([h, s]) => [h, [...s].slice(0, 6).join(" | ")]), note: "Arquivos renomeados ou copiados têm o mesmo hash." });
    }
  }

  blocks.unshift(rows.length
    ? { type: "table", title: `Coincidências de hash com outros casos (${rows.length})`, columns: ["Tipo", "Hash", "Neste caso", "No outro caso", "Caso"], rows: rows.slice(0, 200), note }
    : { type: "text", text: myHashes.length || mine.length ? "Nenhum hash deste caso aparece em outros casos cadastrados." : "Este caso ainda não tem hashes (de evidências ou de arquivos importados) para comparar.", tone: "info" });

  // 3) pessoas e dispositivos
  const people = await prisma.person.findMany({
    where: { caseId: { not: data.id }, OR: [{ email: { not: null } }, { phone: { not: null } }, { document: { not: null } }] },
    select: { code: true, name: true, email: true, phone: true, document: true, case: { select: { code: true } } }, take: 5000
  });
  const pRows: string[][] = [];
  for (const mineP of data.people) {
    for (const o of people) {
      const hits: string[] = [];
      if (mineP.email && o.email && normalize(mineP.email) === normalize(o.email)) hits.push(`e-mail ${o.email}`);
      const mp = normalizeDigits(mineP.phone), op = normalizeDigits(o.phone);
      if (mp.length >= 8 && op.length >= 8 && (mp === op || mp.endsWith(op) || op.endsWith(mp))) hits.push(`telefone ${o.phone}`);
      const md = normalizeDigits(mineP.document), od = normalizeDigits(o.document);
      if (md.length >= 8 && md === od) hits.push("documento");
      if (hits.length) pRows.push([mineP.code + " — " + mineP.name, hits.join(", "), `${o.code} — ${o.name}`, o.case.code]);
    }
  }
  if (pRows.length) blocks.push({ type: "table", title: "Pessoas com dados de contato coincidentes", columns: ["Neste caso", "Coincide em", "No outro caso", "Caso"], rows: pRows.slice(0, 100), note });

  const devices = await prisma.device.findMany({
    where: { caseId: { not: data.id }, OR: [{ imei: { not: null } }, { serialNumber: { not: null } }, { macAddress: { not: null } }] },
    select: { code: true, imei: true, serialNumber: true, macAddress: true, brand: true, model: true, case: { select: { code: true } } }, take: 5000
  });
  const dRows: string[][] = [];
  for (const d of data.devices) for (const o of devices) {
    const hits: string[] = [];
    if (d.imei && o.imei && normalizeDigits(d.imei) === normalizeDigits(o.imei)) hits.push(`IMEI ${o.imei}`);
    if (d.serialNumber && o.serialNumber && normalize(d.serialNumber) === normalize(o.serialNumber)) hits.push(`série ${o.serialNumber}`);
    if (d.macAddress && o.macAddress && normalizeMac(d.macAddress) === normalizeMac(o.macAddress)) hits.push(`MAC ${o.macAddress}`);
    if (hits.length) dRows.push([d.code, hits.join(", "), `${o.code} — ${[o.brand, o.model].filter(Boolean).join(" ")}`, o.case.code]);
  }
  if (dRows.length) blocks.push({ type: "table", title: "Dispositivos com identificadores coincidentes", columns: ["Neste caso", "Coincide em", "No outro caso", "Caso"], rows: dRows.slice(0, 100), note });

  if (!pRows.length && !dRows.length) blocks.push({ type: "text", text: "Nenhuma pessoa ou dispositivo deste caso coincide (e-mail, telefone, documento, IMEI, série ou MAC) com os de outros casos.", tone: "info" });
  return blocks;
}
