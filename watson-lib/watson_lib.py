#!/usr/bin/env python3
"""
watson_lib — utilitário de linha de comando (somente biblioteca padrão do Python) para:

  * curar a biblioteca do Watson (prisma/library/entries.json): validar, listar, buscar, exportar;
  * verificar offline um caso exportado pelo Sherlock (dados.json ou o .zip do pacote);
  * comparar hashes entre dois casos exportados.

O assistente dentro do site NÃO depende deste script (ele roda em TypeScript, no mesmo servidor do
Sherlock). Este utilitário é um complemento para uso no seu computador. Ele não usa IA generativa,
não acessa a internet e não altera nada além dos arquivos que você mandar gravar.

Exemplos:
  python watson_lib.py validate
  python watson_lib.py search "cadeia de custodia"
  python watson_lib.py export-md biblioteca.md
  python watson_lib.py check-case CAS-2026-0001-pacote.zip
  python watson_lib.py compare caso-a.json caso-b.json
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import unicodedata
import zipfile
from datetime import datetime
from pathlib import Path

DEFAULT_LIBRARY = Path(__file__).resolve().parent.parent / "prisma" / "library" / "entries.json"
CATEGORIES = {"PROCEDIMENTO", "FERRAMENTA", "CHECKLIST", "NORMA", "ALERTA", "GLOSSARIO", "MODELO_TEXTO"}
REQUIRED = ("slug", "title", "category", "summary", "content")
STOPWORDS = {"como", "para", "usar", "uso", "qual", "quais", "que", "com", "uma", "sobre", "fazer", "isso", "dos", "das", "por", "mais"}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def norm(text: str | None) -> str:
    text = unicodedata.normalize("NFD", text or "")
    return "".join(c for c in text if unicodedata.category(c) != "Mn").lower()


# --------------------------------------------------------------------------- biblioteca
def load_library(path: Path) -> list[dict]:
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    if not isinstance(data, list):
        raise ValueError("O arquivo da biblioteca deve conter uma lista JSON.")
    return data


def validate_library(entries: list[dict]) -> list[str]:
    problems: list[str] = []
    seen: set[str] = set()
    for i, e in enumerate(entries, 1):
        label = f"item {i} ({e.get('slug', '?')})"
        for field in REQUIRED:
            if not str(e.get(field, "")).strip():
                problems.append(f"{label}: campo obrigatório ausente: {field}")
        slug = str(e.get("slug", ""))
        if slug and not SLUG_RE.match(slug):
            problems.append(f"{label}: slug inválido (use minúsculas, números e hífen)")
        if slug in seen:
            problems.append(f"{label}: slug duplicado")
        seen.add(slug)
        if e.get("category") not in CATEGORIES:
            problems.append(f"{label}: categoria inválida: {e.get('category')!r}")
        if len(str(e.get("summary", ""))) > 300:
            problems.append(f"{label}: resumo com mais de 300 caracteres")
        if e.get("category") in {"NORMA", "FERRAMENTA"} and not e.get("source"):
            problems.append(f"{label}: itens de NORMA/FERRAMENTA devem informar a fonte")
    return problems


def search_library(entries: list[dict], query: str, limit: int = 8) -> list[dict]:
    words = [w for w in re.split(r"[^a-z0-9-]+", norm(query)) if len(w) > 2 and w not in STOPWORDS]
    scored = []
    for e in entries:
        head = norm(f"{e.get('title')} {e.get('tags')}")
        body = norm(f"{e.get('summary')} {e.get('content')}")
        score = sum(3 * (w in head) + (w in head or w in body) for w in words)
        if score:
            scored.append((score, e))
    return [e for _, e in sorted(scored, key=lambda t: -t[0])[:limit]]


# --------------------------------------------------------------------------- casos exportados
def load_case(path: Path) -> dict:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            name = next((n for n in z.namelist() if n.endswith("dados.json")), None)
            if not name:
                raise ValueError("O pacote não contém dados.json.")
            raw = z.read(name)
    else:
        raw = path.read_bytes()
    data = json.loads(raw.decode("utf-8-sig"))
    return data.get("case", data)


def luhn_ok(imei: str | None) -> bool:
    digits = re.sub(r"\D", "", imei or "")
    if len(digits) != 15:
        return False
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        total += d
    return total % 10 == 0


def parse_dt(value) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def check_case(case: dict) -> list[tuple[str, str]]:
    """Subconjunto das regras do Watson que dá para aplicar a um arquivo exportado."""
    out: list[tuple[str, str]] = []
    code = case.get("code", "?")
    for ev in case.get("evidences", []):
        c = ev.get("code")
        hashes = ev.get("hashes", [])
        if ev.get("category") == "DIGITAL" and not hashes:
            out.append(("alta", f"{c}: evidência digital sem hash registrado."))
        by_algo: dict[str, set[str]] = {}
        for h in hashes:
            by_algo.setdefault(h["algorithm"], set()).add(h["value"].lower())
        for algo, values in by_algo.items():
            if len(values) > 1:
                out.append(("alta", f"{c}: {len(values)} valores diferentes de {algo} registrados."))
        events = sorted(ev.get("custodyEvents", []), key=lambda x: x.get("occurredAt", ""))
        if not events:
            out.append(("alta", f"{c}: sem eventos de cadeia de custódia."))
        for prev, cur in zip(events, events[1:]):
            frm = norm(cur.get("fromCustodian"))
            if frm and frm != norm(prev.get("toCustodian")):
                out.append(("alta", f"{c}: elo da custódia não fecha ({prev.get('toCustodian')!r} recebeu; {cur.get('fromCustodian')!r} entregou)."))
        missing = [n for n, k in (("data da coleta", "collectedAt"), ("local da coleta", "collectionPlace")) if not ev.get(k)]
        if missing:
            out.append(("media", f"{c}: não informa {', '.join(missing)}."))
        collected = parse_dt(ev.get("collectedAt"))
        if collected:
            for a in case.get("analyses", []):
                at = parse_dt(a.get("performedAt"))
                if a.get("evidenceId") == ev.get("id") and at and at < collected:
                    out.append(("alta", f"{a.get('code')}: análise anterior à coleta de {c}."))
    for a in case.get("analyses", []):
        if not a.get("toolId") and not a.get("tool"):
            out.append(("media", f"{a.get('code')}: análise sem ferramenta registrada."))
    for f in case.get("findings", []):
        if not f.get("evidenceId") and not f.get("analysisId"):
            out.append(("media", f"{f.get('code')}: achado sem evidência ou análise de origem."))
    for d in case.get("devices", []):
        if d.get("imei") and not luhn_ok(d["imei"]):
            out.append(("media", f"{d.get('code')}: IMEI {d['imei']} não passa na conferência (15 dígitos + Luhn)."))
        if d.get("type") == "SMARTPHONE" and not d.get("imei"):
            out.append(("media", f"{d.get('code')}: smartphone sem IMEI."))
    order = {"alta": 0, "media": 1, "baixa": 2}
    return sorted(out, key=lambda t: order[t[0]]) or [("info", f"Nenhuma lacuna pelas regras offline para {code}.")]


def hash_index(case: dict) -> dict[str, list[str]]:
    idx: dict[str, list[str]] = {}
    for ev in case.get("evidences", []):
        for h in ev.get("hashes", []):
            idx.setdefault(h["value"].lower(), []).append(ev.get("code", "?"))
    return idx


# --------------------------------------------------------------------------- CLI
def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Utilitário da biblioteca e dos casos exportados do Sherlock/Watson.")
    p.add_argument("--library", type=Path, default=DEFAULT_LIBRARY, help="caminho do entries.json")
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate", help="valida a biblioteca")
    sl = sub.add_parser("list", help="lista itens"); sl.add_argument("--category")
    ss = sub.add_parser("search", help="busca por termos"); ss.add_argument("terms", nargs="+")
    sm = sub.add_parser("export-md", help="exporta a biblioteca em Markdown"); sm.add_argument("out", type=Path)
    sc = sub.add_parser("export-csv", help="exporta em CSV (para editar no Excel)"); sc.add_argument("out", type=Path)
    si = sub.add_parser("import-csv", help="mescla um CSV (por slug) na biblioteca"); si.add_argument("csv", type=Path)
    sk = sub.add_parser("check-case", help="verifica lacunas em dados.json ou no .zip do pacote"); sk.add_argument("file", type=Path)
    sp = sub.add_parser("compare", help="compara hashes entre dois casos exportados"); sp.add_argument("a", type=Path); sp.add_argument("b", type=Path)
    a = p.parse_args(argv)

    try:
        if a.cmd == "check-case":
            case = load_case(a.file)
            res = check_case(case)
            print(f"Caso {case.get('code')} — {len(res)} apontamento(s) (subconjunto das regras do Watson)")
            for sev, msg in res:
                print(f"  [{sev.upper():5}] {msg}")
            print("\nObservação: o Watson no site aplica mais regras (diário, comparação entre casos etc.).")
            return 0
        if a.cmd == "compare":
            ca, cb = load_case(a.a), load_case(a.b)
            ia, ib = hash_index(ca), hash_index(cb)
            common = sorted(set(ia) & set(ib))
            print(f"{ca.get('code')} × {cb.get('code')}: {len(common)} hash(es) em comum")
            for h in common:
                print(f"  {h}\n    {ca.get('code')}: {', '.join(ia[h])}\n    {cb.get('code')}: {', '.join(ib[h])}")
            print("\nCoincidência de valor não implica, por si, relação entre os casos.")
            return 0

        entries = load_library(a.library)
        if a.cmd == "validate":
            problems = validate_library(entries)
            for pr in problems:
                print("ERRO:", pr)
            print(f"{len(entries)} item(ns); {len(problems)} problema(s).")
            return 1 if problems else 0
        if a.cmd == "list":
            for e in entries:
                if not a.category or e["category"] == a.category.upper():
                    print(f"{e['category']:<13} {e['slug']:<34} {e['title']}")
            return 0
        if a.cmd == "search":
            hits = search_library(entries, " ".join(a.terms))
            for e in hits:
                print(f"- [{e['category']}] {e['title']}\n    {e['summary']}" + (f"\n    Fonte: {e['source']}" if e.get("source") else ""))
            if not hits:
                print("Nada encontrado.")
            return 0
        if a.cmd == "export-md":
            lines = ["# Biblioteca Watson", ""]
            for cat in sorted({e["category"] for e in entries}):
                lines += [f"## {cat}", ""]
                for e in sorted((x for x in entries if x["category"] == cat), key=lambda x: x["title"]):
                    lines += [f"### {e['title']}", "", f"*{e['summary']}*", "", e["content"], ""]
                    if e.get("source"):
                        lines += [f"**Fonte:** {e['source']}", ""]
            a.out.write_text("\n".join(lines), encoding="utf-8")
            print(f"Gravado {a.out}")
            return 0
        if a.cmd == "export-csv":
            with open(a.out, "w", newline="", encoding="utf-8-sig") as fh:
                w = csv.DictWriter(fh, fieldnames=["slug", "title", "category", "summary", "content", "tags", "appliesTo", "source"], delimiter=";")
                w.writeheader()
                for e in entries:
                    w.writerow({k: e.get(k) or "" for k in w.fieldnames})
            print(f"Gravado {a.out}")
            return 0
        if a.cmd == "import-csv":
            with open(a.csv, newline="", encoding="utf-8-sig") as fh:
                rows = list(csv.DictReader(fh, delimiter=";"))
            by_slug = {e["slug"]: e for e in entries}
            added = changed = 0
            for r in rows:
                new = {k: (r.get(k) or "").strip() for k in ["slug", "title", "category", "summary", "content", "tags", "appliesTo", "source"]}
                new["source"] = new["source"] or None
                if new["slug"] in by_slug:
                    changed += by_slug[new["slug"]] != new
                    by_slug[new["slug"]].update(new)
                else:
                    entries.append(new); by_slug[new["slug"]] = new; added += 1
            problems = validate_library(entries)
            if problems:
                print("\n".join("ERRO: " + x for x in problems)); print("Nada foi gravado."); return 1
            a.library.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"{added} adicionado(s), {changed} alterado(s). Rode 'npm run prisma:seed' para carregar no banco.")
            return 0
    except (OSError, ValueError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        print(f"Erro: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
