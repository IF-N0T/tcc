"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { useToast } from "@/components/ui/Providers";
import Avatar from "@/components/ui/Avatar";

type Note = { id: string; text: string; createdAt: string; author: { name: string } };

export default function NotesTab({ kase, canEdit, post }: { kase: { id: string; caseNotes: Note[] }; canEdit: boolean; post: (url: string, body: unknown) => Promise<unknown> }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const notes = [...kase.caseNotes].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) return;
    setBusy(true);
    try { await post(`/api/cases/${kase.id}/notes`, { text }); setText(""); toast("Nota registrada no diário.", "ok"); }
    catch (err) { toast(err instanceof Error ? err.message : "Erro ao salvar a nota.", "error"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-3">
        {canEdit && (
          <form onSubmit={add} className="card space-y-3 p-4">
            <label className="label" htmlFor="note">Nova anotação</label>
            <textarea id="note" className="input" rows={4} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)}
              placeholder="O que você fez, com qual ferramenta, sobre qual evidência (use o código EVD-…), o que obteve e o que falta."
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") add(e as unknown as React.FormEvent); }} />
            <div className="flex items-center gap-3"><button className="btn-primary" disabled={busy || text.trim().length < 2}>{busy ? "Salvando…" : "Registrar nota"}</button><span className="text-xs text-gray-500">Ctrl+Enter salva · {text.length}/5000</span></div>
          </form>
        )}
        <ol className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="card rise flex gap-3 p-4">
              <Avatar name={n.author.name} size={32} />
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline gap-2 text-xs text-gray-500"><b className="text-sm text-gray-900">{n.author.name}</b><time>{new Date(n.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></div>
                <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800">{n.text}</p></div>
            </li>
          ))}
          {notes.length === 0 && <li className="card flex flex-col items-center gap-2 px-6 py-12 text-center text-gray-500"><NotebookPen size={28} aria-hidden="true" /><p>Nenhuma nota ainda.</p></li>}
        </ol>
      </div>
      <aside className="card h-fit space-y-2 p-4 text-sm text-gray-600">
        <h3 className="font-display text-base font-semibold text-gray-900">Como o Watson usa o diário</h3>
        <p>Ele lê as notas e confere hashes, IMEIs, e-mails, telefones, CPFs, códigos (EVD-…), tipos de mídia e ferramentas citados contra os registros do caso.</p>
        <p>Quando algo citado não está cadastrado, aparece como lacuna. Nada é cadastrado automaticamente.</p>
        <p className="text-xs text-gray-500">Notas são somente de inserção, como a cadeia de custódia: não podem ser editadas nem apagadas.</p>
      </aside>
    </div>
  );
}
