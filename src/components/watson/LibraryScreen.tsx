"use client";

import { useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useConfirm, useToast } from "@/components/ui/Providers";
import { normalize } from "@/lib/text";
import CopyButton from "@/components/ui/CopyButton";

export type Entry = { id: string; slug: string; title: string; category: string; summary: string; content: string; tags: string; appliesTo: string; source: string | null; builtIn: boolean; authorId: string | null };

const CATS: [string, string, string][] = [
  ["PROCEDIMENTO", "Procedimentos", "badge-blue"], ["FERRAMENTA", "Ferramentas", "badge-violet"], ["CHECKLIST", "Checklists", "badge-green"],
  ["NORMA", "Normas", "badge-amber"], ["ALERTA", "Alertas", "badge-red"], ["GLOSSARIO", "Glossário", "badge-neutral"], ["MODELO_TEXTO", "Modelos de texto", "badge-neutral"]
];
const EMPTY = { title: "", category: "PROCEDIMENTO", summary: "", content: "", tags: "", appliesTo: "", source: "" };

export default function LibraryScreen({ initial, role, userId }: { initial: Entry[]; role: string; userId: string }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState(initial);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState<Entry | null>(initial[0] ?? null);
  const [form, setForm] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [saving, setSaving] = useState(false);
  const canEdit = role === "ADMIN" || role === "PERITO";

  const list = useMemo(() => {
    const n = normalize(q);
    return items.filter((e) => (!cat || e.category === cat) && (!n || normalize(`${e.title} ${e.summary} ${e.content} ${e.tags}`).includes(n)));
  }, [items, q, cat]);
  const canChange = (e: Entry) => role === "ADMIN" || (!e.builtIn && e.authorId === userId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    const { id, ...payload } = form;
    const res = await fetch(id ? `/api/library/${id}` : "/api/library", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, source: payload.source || null }) });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { toast(data.error ?? "Não foi possível salvar.", "error"); return; }
    setItems((cur) => (id ? cur.map((x) => (x.id === id ? data : x)) : [...cur, data]).sort((a: Entry, b: Entry) => a.title.localeCompare(b.title, "pt-BR")));
    setOpen(data); setForm(null); toast("Item salvo na biblioteca.", "ok");
  }

  async function remove(entry: Entry) {
    if (!(await confirm({ title: "Excluir item da biblioteca?", message: entry.title, confirmLabel: "Excluir", danger: true }))) return;
    const res = await fetch(`/api/library/${entry.id}`, { method: "DELETE" });
    if (!res.ok) { toast((await res.json().catch(() => ({}))).error ?? "Não foi possível excluir.", "error"); return; }
    setItems((cur) => cur.filter((x) => x.id !== entry.id)); setOpen(null); toast("Item excluído.", "ok");
  }

  const catLabel = (id: string) => CATS.find((c) => c[0] === id)?.[1] ?? id;
  const catBadge = (id: string) => CATS.find((c) => c[0] === id)?.[2] ?? "badge-neutral";

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-3">
        <div className="card space-y-3 p-3">
          <div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input className="input !pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na biblioteca…" aria-label="Buscar na biblioteca" /></div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCat("")} aria-pressed={!cat} className={`badge cursor-pointer ${!cat ? "badge-blue" : "badge-neutral"}`}>Tudo <b>{items.length}</b></button>
            {CATS.map(([id, label]) => <button key={id} type="button" onClick={() => setCat(cat === id ? "" : id)} aria-pressed={cat === id} className={`badge cursor-pointer ${cat === id ? "badge-blue" : "badge-neutral"}`}>{label} <b>{items.filter((e) => e.category === id).length}</b></button>)}
          </div>
          {canEdit && <button type="button" className="btn-primary w-full" onClick={() => setForm({ ...EMPTY })}><Plus size={15} aria-hidden="true" /> Novo item</button>}
        </div>
        <ul className="card max-h-[65vh] divide-y divide-gray-100 overflow-y-auto">
          {list.map((e) => (
            <li key={e.id}><button type="button" onClick={() => { setOpen(e); setForm(null); }} aria-current={open?.id === e.id}
              className={`w-full px-4 py-3 text-left transition hover:bg-gray-100 ${open?.id === e.id ? "bg-brand-500/10" : ""}`}>
              <div className="flex items-center gap-2"><span className={`badge ${catBadge(e.category)}`}>{catLabel(e.category)}</span>{!e.builtIn && <span className="badge badge-green">Meu</span>}</div>
              <div className="mt-1 text-sm font-medium text-gray-900">{e.title}</div><div className="line-clamp-2 text-xs text-gray-500">{e.summary}</div></button></li>
          ))}
          {list.length === 0 && <li className="px-4 py-10 text-center text-sm text-gray-500">Nada encontrado.</li>}
        </ul>
      </div>

      <div>
        {form ? (
          <form onSubmit={save} className="card space-y-4 p-6">
            <div className="flex items-center justify-between"><h2 className="font-display text-lg font-semibold text-gray-900">{form.id ? "Editar item" : "Novo item da biblioteca"}</h2><button type="button" className="btn-ghost btn-sm" onClick={() => setForm(null)} aria-label="Cancelar"><X size={16} /></button></div>
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div><label className="label" htmlFor="lt">Título</label><input id="lt" className="input" required minLength={3} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><label className="label" htmlFor="lc">Categoria</label><select id="lc" className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
            </div>
            <div><label className="label" htmlFor="ls">Resumo (uma frase)</label><input id="ls" className="input" required value={form.summary} maxLength={300} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
            <div><label className="label" htmlFor="lcn">Conteúdo</label><textarea id="lcn" className="input font-mono text-[13px]" rows={10} required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="label" htmlFor="lg">Palavras-chave (vírgula)</label><input id="lg" className="input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              <div><label className="label" htmlFor="la">Aplica-se a (gatilhos)</label><input id="la" className="input" placeholder="SMARTPHONE, Autopsy, GAP_HASH_AUSENTE" value={form.appliesTo} onChange={(e) => setForm({ ...form, appliesTo: e.target.value })} /></div>
            </div>
            <p className="-mt-2 text-xs text-gray-500">Gatilhos fazem o Watson sugerir este item: tipos de evidência (SMARTPHONE, HD…), nomes de ferramentas (Autopsy, ImageJ…), códigos de lacuna (GAP_…) ou * para sempre.</p>
            <div><label className="label" htmlFor="lf">Fonte / referência</label><input id="lf" className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Norma, manual, documentação oficial…" /></div>
            <div className="flex gap-2 border-t border-gray-200 pt-4"><button className="btn-primary" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button><button type="button" className="btn-secondary" onClick={() => setForm(null)}>Cancelar</button></div>
          </form>
        ) : open ? (
          <article className="card rise p-6">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><span className={`badge ${catBadge(open.category)}`}>{catLabel(open.category)}</span><h2 className="font-display mt-2 text-2xl font-semibold text-gray-900">{open.title}</h2><p className="mt-1 text-sm text-gray-500">{open.summary}</p></div>
              <div className="flex gap-1"><CopyButton text={`${open.title}\n\n${open.content}${open.source ? `\n\nFonte: ${open.source}` : ""}`} />
                {canChange(open) && <button type="button" className="btn-ghost btn-sm" onClick={() => setForm({ id: open.id, title: open.title, category: open.category, summary: open.summary, content: open.content, tags: open.tags, appliesTo: open.appliesTo, source: open.source ?? "" })}><Pencil size={14} aria-hidden="true" /> Editar</button>}
                {canChange(open) && !open.builtIn && <button type="button" className="btn-ghost btn-sm !text-red-500" onClick={() => remove(open)}><Trash2 size={14} aria-hidden="true" /> Excluir</button>}</div>
            </div>
            <div className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-gray-800">{open.content}</div>
            <dl className="mt-6 space-y-2 border-t border-gray-200 pt-4 text-xs text-gray-500">
              {open.source && <div><dt className="inline font-semibold text-gray-700">Fonte: </dt><dd className="inline">{open.source}</dd></div>}
              {open.tags && <div><dt className="inline font-semibold text-gray-700">Palavras-chave: </dt><dd className="inline">{open.tags}</dd></div>}
              {open.appliesTo && <div><dt className="inline font-semibold text-gray-700">O Watson sugere quando há: </dt><dd className="inline font-mono">{open.appliesTo}</dd></div>}
              <div>{open.builtIn ? "Item padrão da biblioteca." : "Item criado por um usuário."} Conhecimento geral, não é dado de caso; confirme normas e procedimentos na fonte oficial.</div>
            </dl>
          </article>
        ) : (
          <div className="card flex flex-col items-center gap-2 px-6 py-20 text-center text-gray-500"><BookOpen size={32} aria-hidden="true" /><p>Selecione um item para ler.</p></div>
        )}
      </div>
    </div>
  );
}
