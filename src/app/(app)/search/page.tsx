"use client";

import { useState } from "react";
import Link from "next/link";

type Result = { kind: string; code: string; label: string; caseId: string; caseCode: string };

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    acc[r.caseCode] = acc[r.caseCode] ?? [];
    acc[r.caseCode].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Central de Investigação</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pesquise por e-mails, telefones, IMEIs, números de série, códigos ou nomes em todos os casos autorizados.
        </p>
      </div>

      <form onSubmit={runSearch} className="flex gap-2">
        <input
          className="input"
          placeholder="ex.: joao@gmail.com, EVD-2026-0001, IMEI, nome da pessoa..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-primary" disabled={loading} type="submit">
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-gray-400">Nenhuma ocorrência encontrada para este termo.</p>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([caseCode, items]) => (
          <div key={caseCode} className="card p-4">
            <div className="text-sm font-semibold text-brand-700 mb-2">{caseCode}</div>
            <ul className="space-y-1">
              {items.map((r, idx) => (
                <li key={idx} className="text-sm flex items-center justify-between">
                  <span>
                    <span className="text-xs uppercase text-gray-400 mr-2">{r.kind}</span>
                    <span className="text-gray-500 mr-2">{r.code}</span>
                    {r.label}
                  </span>
                  <Link href={`/cases/${r.caseId}`} className="text-brand-700 text-xs hover:underline">
                    Abrir caso
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
