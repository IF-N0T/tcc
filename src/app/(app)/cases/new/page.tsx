"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Providers";

const PRIORITIES = [
  ["BAIXA", "Baixa", "Sem prazo crítico"], ["MEDIA", "Média", "Fluxo normal"], ["ALTA", "Alta", "Exige atenção"], ["CRITICA", "Crítica", "Urgente"]
] as const;

export default function NewCasePage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<string>("MEDIA");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, priority }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Erro ao criar caso"); return; }
      toast(`Caso ${data.code ?? ""} criado.`, "ok");
      router.push(`/cases/${data.id}`);
      router.refresh();
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Investigação" title="Novo caso" description="O código (CAS-ANO-NNNN) é gerado automaticamente. Evidências, pessoas e hashes são adicionados depois, dentro do caso." />
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">Nome do caso</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={3} autoFocus placeholder="Ex.: Fraude financeira — Operação Alfa" />
        </div>
        <div>
          <label className="label" htmlFor="desc">Descrição</label>
          <textarea id="desc" className="input" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto, solicitante, objetivo do exame…" />
          <p className="mt-1 text-xs text-gray-500">Uma boa descrição alimenta o rascunho de laudo do Watson.</p>
        </div>
        <fieldset>
          <legend className="label">Prioridade</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {PRIORITIES.map(([id, label, hint]) => (
              <label key={id} className={`cursor-pointer rounded-lg border p-3 text-sm transition ${priority === id ? "border-brand-500 bg-brand-500/10" : "border-gray-200 hover:bg-gray-100"}`}>
                <input type="radio" name="priority" value={id} checked={priority === id} onChange={() => setPriority(id)} className="sr-only" />
                <span className="block font-medium text-gray-900">{label}</span><span className="text-xs text-gray-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 border-t border-gray-200 pt-4">
          <button className="btn-primary" disabled={loading} type="submit">{loading ? "Criando…" : "Criar caso"}</button>
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
